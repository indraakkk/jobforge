{
  description = "JobForge development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv.url = "github:cachix/devenv/aa9968386bc65519c174cfef1ae4b3464c19ba0a";
    systems.url = "github:nix-systems/default";
  };

  outputs =
    inputs@{
      self,
      nixpkgs,
      devenv,
      systems,
      ...
    }:
    let
      forAllSystems =
        f: nixpkgs.lib.genAttrs (import systems) (system: f (import nixpkgs { inherit system; }));

      mkEnv =
        pkgs:
        devenv.lib.mkShell {
          inherit pkgs inputs;
          modules = [ ./devenv.nix ];
        };
    in
    {
      devShells = forAllSystems (pkgs: {
        default = mkEnv pkgs;
      });
      packages = forAllSystems (pkgs: {
        default = mkEnv pkgs;
      });
    };
}
