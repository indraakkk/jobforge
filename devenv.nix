{ pkgs, config, ... }:

{
  packages = [
    pkgs.bun
    pkgs.uv
  ];

  # DNS: resolve jobforge.test to localhost
  hosts."jobforge.test" = "127.0.0.1";

  # TLS: generate trusted local certificate via mkcert
  certificates = [
    "jobforge.test"
  ];

  # Reverse proxy: Caddy terminates TLS, proxies to Vite/built app
  services.caddy = {
    enable = true;
    config = ''
      https://jobforge.test:8443 {
        tls ${config.env.DEVENV_STATE}/mkcert/jobforge.test.pem ${config.env.DEVENV_STATE}/mkcert/jobforge.test-key.pem
        reverse_proxy localhost:3000 {
          transport http {
            read_timeout 300s
            write_timeout 300s
          }
        }
      }
    '';
  };

  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    initialDatabases = [ { name = "jobforge"; } ];
    listen_addresses = "127.0.0.1";
    port = 5455;
  };

  env = {
    DATABASE_URL = "postgresql://indra@localhost:5455/jobforge";
    MINIO_ENDPOINT = "localhost";
    MINIO_PORT = "9000";
    MINIO_ACCESS_KEY = "jobforge";
    MINIO_SECRET_KEY = "jobforge-secret";
    MINIO_BUCKET = "cv-files";
    MINIO_USE_SSL = "false";
  };

  scripts = {
    dev.exec = "bun run dev";
    build.exec = "bun run build";
  };

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
