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

      agsPkg = ags.packages.${system}.default;
      astal4 = astal.packages.${system}.astal4;
      astalIo = astal.packages.${system}.io;

      runtimeDeps = [
        pkgs.gjs
        pkgs.gtk4
        pkgs.gtk4-layer-shell
        pkgs.libsoup_3
        pkgs.glib
        pkgs.glib-networking
        pkgs.json-glib
        astal4
        astalIo
      ];
    in {
      packages.${system}.default = pkgs.buildNpmPackage {
        pname = "caldy";
        version = "0.1.0";

        src = pkgs.lib.cleanSourceWith {
          src = pkgs.lib.cleanSource ./.;
          filter = path: _type:
            let baseName = baseNameOf (toString path);
            in !(builtins.elem baseName [ "node_modules" "dist" ".direnv" ]);
        };

        npmDepsHash = "sha256-H6CSiXwZ+vqQuiB9dj5U7m2yetPtfayUTwQ1ETapLRk=";

        nativeBuildInputs = [
          agsPkg
          pkgs.wrapGAppsHook4
          pkgs.gobject-introspection
        ];

        buildInputs = runtimeDeps;

        # `ags bundle` requires the output directory to exist.
        preBuild = ''
          mkdir -p dist
        '';

        # The `build` script in package.json runs `ags bundle ... ./dist/caldy`.
        # We override the install step to place that single artifact in $out/bin.
        dontNpmInstall = true;
        installPhase = ''
          runHook preInstall
          install -Dm755 dist/caldy $out/bin/caldy
          runHook postInstall
        '';

        # Make glib-networking's TLS backend available so HTTPS calls to Google work.
        preFixup = ''
          gappsWrapperArgs+=(
            --prefix GIO_EXTRA_MODULES : "${pkgs.glib-networking}/lib/gio/modules"
          )
        '';

        meta = with pkgs.lib; {
          description = "Google Calendar weekly widget (Astal4 + GJS)";
          homepage = "https://github.com/peteyycz/caldy";
          platforms = platforms.linux;
          mainProgram = "caldy";
        };
      };

      apps.${system}.default = {
        type = "app";
        program = "${self.packages.${system}.default}/bin/caldy";
      };

      homeManagerModules.default = { config, lib, pkgs, ... }:
        let cfg = config.programs.caldy;
        in {
          options.programs.caldy = {
            enable = lib.mkEnableOption "caldy — Google Calendar weekly widget";
            package = lib.mkOption {
              type = lib.types.package;
              default = self.packages.${pkgs.system}.default;
              defaultText = lib.literalExpression "caldy.packages.\${pkgs.system}.default";
              description = "The caldy package to install.";
            };
          };

          config = lib.mkIf cfg.enable {
            # astalIo ships the `astal` CLI used to send toggle/show/hide
            # requests to the running caldy instance (e.g. from a compositor
            # bind: `astal -i caldy toggle`).
            home.packages = [ cfg.package astalIo ];

            systemd.user.services.caldy = {
              Unit = {
                Description = "caldy — Google Calendar weekly widget";
                PartOf = [ "graphical-session.target" ];
                After = [ "graphical-session.target" ];
              };
              Service = {
                ExecStart = lib.getExe cfg.package;
                Restart = "on-failure";
                RestartSec = 5;
              };
              Install.WantedBy = [ "graphical-session.target" ];
            };
          };
        };

      devShells.${system}.default = pkgs.mkShell {
        name = "caldy-dev";

        packages = [
          agsPkg
          astal4
          astalIo

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
