# Local HTTPS Dev Setup: mkcert + Caddy via devenv.nix

> Complete plan for serving JobForge at `https://jobforge.test:8443` with trusted local certificates, using devenv's built-in mkcert and Caddy integrations.

---

## Table of Contents

1. [Goal](#goal)
2. [Architecture](#architecture)
3. [Why This Approach](#why-this-approach)
4. [Prerequisites](#prerequisites)
5. [Changes Required](#changes-required)
   - [devenv.nix](#1-devenvnix--full-replacement)
   - [vite.config.ts](#2-viteconfigts--add-allowedhosts)
6. [Dev Workflow](#dev-workflow)
7. [Build Preview Workflow](#build-preview-workflow)
8. [Verification Checklist](#verification-checklist)
9. [How It Works Under the Hood](#how-it-works-under-the-hood)
10. [Troubleshooting](#troubleshooting)
11. [Future: Multi-Project Wildcard](#future-multi-project-wildcard)
12. [Research Notes: Why NOT dnsmasq](#research-notes-why-not-dnsmasq)

---

## Goal

Replace `http://localhost:3000` with `https://jobforge.test:8443` for both:

- **Dev mode** (`bun run dev` — Vite dev server with HMR)
- **Build preview** (`bun run build && bun run start` — production build served by Nitro/Bun)

Benefits:
- Trusted HTTPS (green lock, no browser warnings)
- Proper cookie behavior (Secure, SameSite attributes)
- Service worker support (requires HTTPS)
- Web Crypto API access
- CORS testing with real domain names
- Production-like URLs

---

## Architecture

```
Browser
  |
  | https://jobforge.test:8443
  v
Caddy (devenv process, port 8443)
  |  - TLS termination using mkcert certificate
  |  - WebSocket upgrade handling (for HMR)
  |
  | reverse_proxy (HTTP)
  v
localhost:3000 (Vite dev server OR built app)
```

Three devenv features work together:

| Feature | What It Does |
|---------|-------------|
| `hosts."jobforge.test"` | Adds `127.0.0.1 jobforge.test` to `/etc/hosts` |
| `certificates = ["jobforge.test"]` | Generates trusted TLS cert via mkcert |
| `services.caddy` | Runs Caddy as reverse proxy, terminates TLS |

No system-level services (dnsmasq, pfctl) needed. Everything is managed by devenv.

---

## Why This Approach

### Why devenv `hosts` instead of dnsmasq

| Concern | dnsmasq | devenv `hosts` |
|---------|---------|----------------|
| System-wide service (port 53, root) | Yes, needs brew + sudo | No, just `/etc/hosts` |
| Conflicts with mDNSResponder | Yes, port 53 conflict | No conflict |
| Works on Darwin 25.x (macOS Tahoe) | `/etc/resolver/` is broken | `/etc/hosts` always works |
| Per-project configuration | Global config | Declarative per devenv.nix |
| Wildcard DNS (`*.test`) | Yes | No (one entry per domain) |

For a single project, `hosts` is simpler and more reliable. Wildcard DNS is only needed if you're running many `.test` domains simultaneously — see [Future: Multi-Project Wildcard](#future-multi-project-wildcard).

### Why port 8443 instead of 443

Binding to port 443 requires root privileges. Options considered:

| Approach | Reliability on Darwin 25.x | Complexity |
|----------|---------------------------|------------|
| Caddy on 8443 (chosen) | Works everywhere | None |
| pfctl 443 -> 8443 | Unreliable, rules may not persist | High |
| Run Caddy as root | Bad practice, breaks devenv | High |
| macOS launchd forwarding | Poorly documented | High |

Port 8443 is the standard HTTPS alternative port. The URL `https://jobforge.test:8443` is slightly longer but works without any privilege escalation.

### Why raw Caddyfile (`config`) instead of `virtualHosts`

devenv's `services.caddy.virtualHosts` uses the attribute key as the Caddyfile site address. The key format for custom ports (like `"jobforge.test:8443"`) is ambiguous in documentation. Using `services.caddy.config` with a raw Caddyfile string gives full control and avoids any nix module interpretation issues.

---

## Prerequisites

- devenv already set up and working (existing `devenv.nix` + `flake.nix` + `.envrc`)
- No additional system packages needed — devenv provides mkcert and Caddy via nix

---

## Changes Required

### 1. `devenv.nix` — Full Replacement

Replace the entire contents of `devenv.nix` with:

```nix
{ pkgs, config, ... }:

{
  packages = [
    pkgs.bun
    pkgs.uv
  ];

  # -------------------------------------------------------------------
  # DNS: resolve jobforge.test to localhost
  # -------------------------------------------------------------------
  # devenv manages /etc/hosts entries declaratively.
  # Adds "127.0.0.1 jobforge.test" to /etc/hosts when devenv activates.
  # May prompt for sudo password on first run.
  hosts."jobforge.test" = "127.0.0.1";

  # -------------------------------------------------------------------
  # TLS: generate trusted local certificate via mkcert
  # -------------------------------------------------------------------
  # On first run:
  #   1. Installs mkcert's root CA into the macOS system trust store
  #      (prompts for keychain password once)
  #   2. Generates jobforge.test.pem and jobforge.test-key.pem
  #      in $DEVENV_STATE/mkcert/
  #
  # On subsequent runs: reuses existing certs (regenerates if domain
  # list changes).
  #
  # Also sets these env vars automatically:
  #   - CAROOT: path to mkcert's root CA directory
  #   - NODE_EXTRA_CA_CERTS: path to root CA cert (for Node.js/Bun)
  certificates = [
    "jobforge.test"
  ];

  # -------------------------------------------------------------------
  # Reverse proxy: Caddy terminates TLS, proxies to Vite/built app
  # -------------------------------------------------------------------
  # Caddy runs as a devenv process (started by `devenv up`).
  # Listens on port 8443 (unprivileged, no sudo needed).
  # Proxies all requests (including WebSocket for HMR) to localhost:3000.
  #
  # Raw Caddyfile syntax used for full control over port binding.
  # The tls directive points to mkcert-generated certs.
  services.caddy = {
    enable = true;
    config = ''
      https://jobforge.test:8443 {
        tls ${config.env.DEVENV_STATE}/mkcert/jobforge.test.pem ${config.env.DEVENV_STATE}/mkcert/jobforge.test-key.pem
        reverse_proxy localhost:3000
      }
    '';
  };

  # -------------------------------------------------------------------
  # Database: PostgreSQL 16
  # -------------------------------------------------------------------
  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    initialDatabases = [ { name = "jobforge"; } ];
    listen_addresses = "127.0.0.1";
    port = 5455;
  };

  # -------------------------------------------------------------------
  # Environment variables
  # -------------------------------------------------------------------
  env = {
    DATABASE_URL = "postgresql://indra@localhost:5455/jobforge";
    MINIO_ENDPOINT = "localhost";
    MINIO_PORT = "9000";
    MINIO_ACCESS_KEY = "jobforge";
    MINIO_SECRET_KEY = "jobforge-secret";
    MINIO_BUCKET = "cv-files";
    MINIO_USE_SSL = "false";
  };

  # -------------------------------------------------------------------
  # Convenience scripts
  # -------------------------------------------------------------------
  scripts = {
    dev.exec = "bun run dev";
    build.exec = "bun run build";
  };

  # -------------------------------------------------------------------
  # Shell greeting
  # -------------------------------------------------------------------
  enterShell = ''
    echo "JobForge development environment ready!"
    echo ""
    echo "Services (start with 'devenv up' in another terminal):"
    echo "  - postgres on port 5455"
    echo "  - caddy on port 8443 (reverse proxy to localhost:3000)"
    echo ""
    echo "Commands:"
    echo "  - dev: Start Vite dev server (port 3000)"
    echo "  - build: Build for production"
    echo "  - bun db:migrate: Run database migrations"
    echo "  - bun db:seed: Seed sample data"
    echo "  - docker compose up -d: Start MinIO"
    echo ""
    echo "Access: https://jobforge.test:8443"
  '';
}
```

#### What Changed From Current devenv.nix

| Change | Why |
|--------|-----|
| `{ pkgs, ... }:` -> `{ pkgs, config, ... }:` | Need `config.env.DEVENV_STATE` to reference mkcert cert paths |
| Added `hosts."jobforge.test"` | DNS resolution without dnsmasq |
| Added `certificates = [...]` | mkcert cert generation (devenv built-in) |
| Added `services.caddy` block | HTTPS reverse proxy |
| Updated `enterShell` messages | Reflect new services and access URL |

#### What Stayed The Same

- `packages` (bun, uv)
- `services.postgres` (unchanged)
- `env` (all environment variables unchanged)
- `scripts` (dev, build unchanged)

---

### 2. `vite.config.ts` — Add allowedHosts

Add `allowedHosts: ["jobforge.test"]` to the `server` block. This is the **only change** to this file.

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { devtools } from "@tanstack/devtools-vite";
import path from "node:path";

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: ["jobforge.test"],  // <-- NEW: allow Caddy-proxied requests
    watch: {
      ignored: ["**/nix/store/**", "**/.devenv/**", "**/.direnv/**"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "src"),
      "@": path.resolve(import.meta.dirname, "src"),
      "db": path.resolve(import.meta.dirname, "db"),
    },
  },
  plugins: [
    tailwindcss(),
    devtools(),
    tanstackStart({ react: { babel: false } }),
    react(),
  ],
});
```

#### Why This Is Needed

Since Vite 5.4.12 (and Vite 6.x which this project uses), Vite checks the `Host` header on incoming requests to prevent DNS rebinding attacks. When Caddy proxies `https://jobforge.test:8443` to `localhost:3000`, the `Host` header is `jobforge.test`. Without `allowedHosts`, Vite blocks the request:

```
Blocked request. This host ("jobforge.test") is not allowed.
```

#### Why No HMR Config Changes

No `hmr.host`, `hmr.protocol`, or `hmr.clientPort` settings needed because:

1. Caddy handles WebSocket upgrade requests transparently via `reverse_proxy`
2. The browser loads the page from `https://jobforge.test:8443`
3. Vite's HMR client connects to the page's origin: `wss://jobforge.test:8443`
4. This WebSocket connection hits Caddy, which proxies it to `ws://localhost:3000`
5. Vite's HMR server on port 3000 receives the connection and handles hot updates

The key insight: since the browser's page origin and HMR WebSocket target are the same (`jobforge.test:8443`), and Caddy proxies both HTTP and WebSocket to the same backend (`localhost:3000`), everything aligns automatically.

---

## Dev Workflow

After making the two file changes above:

```bash
# Terminal 1: Start services (Caddy + Postgres)
# First run will prompt for:
#   - sudo password (for /etc/hosts modification)
#   - keychain password (for mkcert CA installation)
devenv up

# Terminal 2: Start Vite dev server
devenv shell          # (or automatic via direnv)
dev                   # alias for: bun run dev

# Browser: open the app
open https://jobforge.test:8443
```

On subsequent runs, no password prompts — certs and hosts entry are already set up.

---

## Build Preview Workflow

Same URL, different backend process:

```bash
# Terminal 1: Services already running from `devenv up`

# Terminal 2: Build and preview
build                 # alias for: bun run build
bun run start         # starts built app on localhost:3000

# Browser: same URL
open https://jobforge.test:8443
```

Caddy doesn't care what's running on `localhost:3000` — it proxies to whatever is there. So switching between dev server and built app is seamless.

---

## Verification Checklist

After setup, verify each component:

### 1. mkcert CA Installed

```bash
# Check that mkcert root CA is in the system trust store
security find-certificate -a -c "mkcert" /Library/Keychains/System.keychain
```

Expected: certificate details for "mkcert" CA.

### 2. Certificate Generated

```bash
# Check cert files exist
ls -la .devenv/state/mkcert/
```

Expected: `jobforge.test.pem` and `jobforge.test-key.pem`.

### 3. DNS Resolution

```bash
# Verify /etc/hosts entry
grep jobforge.test /etc/hosts
```

Expected: `127.0.0.1 jobforge.test`

```bash
# Verify resolution
ping -c 1 jobforge.test
```

Expected: `PING jobforge.test (127.0.0.1)`

### 4. Caddy Running

```bash
# Check Caddy is listening on 8443
lsof -i :8443
```

Expected: caddy process bound to port 8443.

### 5. HTTPS Working

```bash
# Curl with trusted cert
curl -I https://jobforge.test:8443
```

Expected: HTTP response (200 or redirect), no SSL errors.

### 6. Browser Certificate

Open `https://jobforge.test:8443` in browser. Click the lock icon. Certificate should show:
- Issued to: `jobforge.test`
- Issued by: `mkcert <user>@<hostname>`
- Valid (green/trusted)

### 7. HMR Working

1. Open `https://jobforge.test:8443` with dev server running
2. Open browser DevTools console
3. Look for: `[vite] connected.`
4. Edit any React component (e.g., change text in `src/routes/__root.tsx`)
5. Change should appear immediately without full page reload
6. Console should show: `[vite] hot updated: /src/routes/__root.tsx`
7. No WebSocket errors in console

### 8. Build Preview Working

```bash
build && bun run start
```

Open `https://jobforge.test:8443` — should serve the production build.

---

## How It Works Under the Hood

### Execution Order (on `devenv up`)

```
1. devenv activates environment
   ├── Loads packages (bun, uv) into PATH
   ├── Sets environment variables (DATABASE_URL, MINIO_*, CAROOT, NODE_EXTRA_CA_CERTS)
   └── Modifies /etc/hosts (adds jobforge.test entry, may prompt sudo)

2. Pre-process tasks run
   └── devenv:mkcert:setup task
       ├── Checks if root CA is installed → runs `mkcert -install` if not
       ├── Checks if cert files exist for listed domains
       └── Generates jobforge.test.pem + jobforge.test-key.pem if missing

3. Process manager (process-compose) starts services
   ├── caddy
   │   ├── Reads generated Caddyfile (from services.caddy.config)
   │   ├── Loads TLS cert from $DEVENV_STATE/mkcert/
   │   └── Listens on port 8443
   └── postgres
       ├── Initializes data directory if needed
       ├── Creates "jobforge" database if not exists
       └── Listens on port 5455

4. User runs `dev` in another terminal
   └── bun run dev
       └── Vite dev server starts on localhost:3000

5. Browser request flow
   https://jobforge.test:8443
   → /etc/hosts resolves to 127.0.0.1
   → Caddy on port 8443
   → TLS handshake with mkcert cert (browser trusts it)
   → Caddy proxies to http://localhost:3000
   → Vite serves the app
```

### File Locations

| What | Where |
|------|-------|
| mkcert root CA | `~/.local/share/mkcert/` (macOS default) |
| Generated cert | `.devenv/state/mkcert/jobforge.test.pem` |
| Generated key | `.devenv/state/mkcert/jobforge.test-key.pem` |
| Caddy data | `.devenv/state/caddy/` |
| Postgres data | `.devenv/state/postgres/` |
| Hosts entry | `/etc/hosts` (system file) |

---

## Troubleshooting

### "Blocked request. This host is not allowed."

Vite is rejecting the `jobforge.test` hostname. Ensure `allowedHosts: ["jobforge.test"]` is in `vite.config.ts` under `server`.

### Browser shows "NET::ERR_CERT_AUTHORITY_INVALID"

mkcert root CA not trusted. Run:
```bash
mkcert -install
```
Then restart browser (some browsers cache cert decisions).

### "address already in use :8443"

Another process is using port 8443. Check with:
```bash
lsof -i :8443
```
Kill the conflicting process or change Caddy's port in `devenv.nix`.

### HMR not working (changes require manual refresh)

1. Check browser console for WebSocket errors
2. Ensure Caddy is running: `lsof -i :8443`
3. Ensure Vite is running: `lsof -i :3000`
4. Try adding explicit HMR config to `vite.config.ts` as fallback:
   ```typescript
   server: {
     port: 3000,
     allowedHosts: ["jobforge.test"],
     hmr: {
       host: "jobforge.test",
       protocol: "wss",
       clientPort: 8443,
     },
   },
   ```

### `devenv up` fails with "permission denied" on /etc/hosts

The `hosts` option needs to modify `/etc/hosts`. Grant sudo access when prompted, or manually add the entry:
```bash
echo '127.0.0.1 jobforge.test' | sudo tee -a /etc/hosts
```

### Cert files not found by Caddy

Ensure the mkcert setup task ran before Caddy starts. Check:
```bash
ls .devenv/state/mkcert/
```
If empty, run `devenv up` again — the mkcert task should execute before Caddy.

---

## Future: Multi-Project Wildcard

For running multiple `.test` domains (betteros.test, pathfinder.test, etc.) simultaneously:

### Option A: Per-Project hosts (current approach, scales to ~5 projects)

Each project's `devenv.nix` declares its own domain:

```nix
# betteros/devenv.nix
hosts."betteros.test" = "127.0.0.1";
certificates = ["betteros.test"];
services.caddy.config = ''
  https://betteros.test:8443 { ... }
'';
```

Limitation: each project adds its own `/etc/hosts` entry. Works fine for a handful of projects.

### Option B: System-wide dnsmasq (if /etc/resolver gets fixed)

If Apple fixes `/etc/resolver/` on Darwin 25.x, this becomes viable:

```bash
# Install via Homebrew (NOT devenv — it's a system service)
brew install dnsmasq

# Wildcard *.test -> 127.0.0.1
echo 'address=/.test/127.0.0.1' >> $(brew --prefix)/etc/dnsmasq.conf

# Run on port 5300 to avoid mDNSResponder conflict
echo 'port=5300' >> $(brew --prefix)/etc/dnsmasq.conf

# Start as system service
sudo brew services start dnsmasq

# Route .test queries to dnsmasq
sudo mkdir -p /etc/resolver
printf 'nameserver 127.0.0.1\nport 5300\n' | sudo tee /etc/resolver/test
```

Then remove `hosts` from devenv.nix — dnsmasq handles all `*.test` resolution.

---

## Research Notes: Why NOT dnsmasq

The original research recommended dnsmasq + mkcert + Caddy. After testing against macOS Darwin 25.3.0, several issues emerged:

### 1. `/etc/resolver/` is broken on Darwin 25.x

macOS Tahoe (Darwin 25.x) has a known regression where `mDNSResponder` intercepts queries for custom TLDs (`.test`, `.internal`, etc.) and treats them as mDNS multicast queries, ignoring `/etc/resolver/` configuration files entirely. This means dnsmasq never receives the DNS queries.

**Source:** Confirmed bug reports across macOS Sequoia and Tahoe releases.

### 2. Port 53 conflicts with mDNSResponder

Both dnsmasq and macOS's built-in `mDNSResponder` want port 53. Running dnsmasq on port 5300 works around this, but then requires `/etc/resolver/test` to specify the non-standard port — which loops back to problem #1.

### 3. dnsmasq is a system service, not a dev tool

dnsmasq needs to run as root on port 53 (or 5300) and persist across reboots. This is fundamentally a system-level service, not something that should live in a per-project devenv.nix. Installing it via `pkgs.dnsmasq` in devenv only makes the binary available — it can't run as a privileged service from within devenv's process manager.

### 4. `/etc/hosts` just works

The `/etc/hosts` file is the most reliable DNS override on every OS version. It's simple, requires no additional services, and devenv has built-in support for managing it (`hosts` option). The only downside is no wildcard support — but for per-project development, explicit entries are fine.
