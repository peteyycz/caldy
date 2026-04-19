{
  description = "Caldy — Google Calendar weekly widget (Astal4)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    astal = {
      url = "github:aylur/astal";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, astal, ags }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        name = "caldy-dev";

        packages = [
          ags.packages.${system}.default
          astal.packages.${system}.default
          astal.packages.${system}.io

          pkgs.gjs
          pkgs.gtk4
          pkgs.gtk4-layer-shell
          pkgs.libsoup_3
          pkgs.glib
          pkgs.glib-networking
          pkgs.json-glib
          pkgs.gobject-introspection

          pkgs.dart-sass
          pkgs.esbuild
          pkgs.nodejs
          pkgs.typescript
        ];

        shellHook = ''
          export GIO_EXTRA_MODULES="${pkgs.glib-networking}/lib/gio/modules''${GIO_EXTRA_MODULES:+:$GIO_EXTRA_MODULES}"
          echo "caldy dev shell — run: npm run types && npm run dev"
        '';
      };
    };
}
