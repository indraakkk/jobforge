{ pkgs, ... }:

{
  packages = [
    pkgs.bun
    pkgs.uv
  ];

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
    echo "Available tools:"
    echo "  - bun $(bun --version)"
    echo "  - postgres (service auto-starts on port 5455)"
    echo ""
    echo "Commands:"
    echo "  - dev: Start development server"
    echo "  - build: Build for production"
    echo "  - bun db:migrate: Run database migrations"
    echo "  - bun db:seed: Seed sample data"
    echo "  - docker compose up -d: Start MinIO"
  '';
}
