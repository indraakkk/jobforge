import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { devtools } from "@tanstack/devtools-vite";
import path from "node:path";

export default defineConfig({
  server: {
    port: 3000,
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
