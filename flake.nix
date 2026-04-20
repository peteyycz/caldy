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
        pkgs.libsecret
        pkgs.glib
        pkgs.glib-networking
        pkgs.json-glib
        astal4
        astalIo
      ];

      # Desktop OAuth client — Google classifies these as public
      # credentials. PKCE protects the auth flow; the calendar project
      # has only the Calendar API (free, quota-only) enabled. Same
      # pattern as gnome-online-accounts, Thunderbird, Evolution.
      defaultClientId = "285266319800-h9kcbfncimvi88kermsepo6rbpq58qr0.apps.googleusercontent.com";
      defaultClientSecret = "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";
    in {
      packages.${system}.default = pkgs.callPackage (
        { lib, buildNpmPackage, wrapGAppsHook4, gobject-introspection
        , glib-networking
        , clientId ? defaultClientId
        , clientSecret ? defaultClientSecret
        }:
        buildNpmPackage {
          pname = "caldy";
          version = "0.1.0";

          src = lib.cleanSourceWith {
            src = lib.cleanSource ./.;
            filter = path: _type:
              let baseName = baseNameOf (toString path);
              in !(builtins.elem baseName [ "node_modules" "dist" ".direnv" ]);
          };

          npmDepsHash = "sha256-H6CSiXwZ+vqQuiB9dj5U7m2yetPtfayUTwQ1ETapLRk=";

          nativeBuildInputs = [ agsPkg wrapGAppsHook4 gobject-introspection ];
          buildInputs = runtimeDeps;

          # Bake OAuth credentials into Config.ts at build time. Defaults
          # to caldy's shared desktop client; pass empty strings via
          # `.override { clientId = ""; clientSecret = ""; }` to keep the
          # placeholders intact and fall back to CALDY_GOOGLE_CLIENT_ID /
          # CALDY_GOOGLE_CLIENT_SECRET env vars at runtime.
          preBuild = ''
            mkdir -p dist
            substituteInPlace src/services/Config.ts \
              --replace-fail '__CALDY_CLIENT_ID__'     '${clientId}' \
              --replace-fail '__CALDY_CLIENT_SECRET__' '${clientSecret}'
          '';

          # `npm run build` bundles to ./dist/caldy. The bundled app uses
          # Gio.ApplicationFlags.HANDLES_COMMAND_LINE, so `caldy toggle` from
          # a compositor bind forwards over DBus to the running instance —
          # no wrapper or external client needed.
          dontNpmInstall = true;
          installPhase = ''
            runHook preInstall
            install -Dm755 dist/caldy $out/bin/caldy
            runHook postInstall
          '';

          # Make glib-networking's TLS backend available so HTTPS calls to Google work.
          preFixup = ''
            gappsWrapperArgs+=(
              --prefix GIO_EXTRA_MODULES : "${glib-networking}/lib/gio/modules"
            )
          '';

          meta = with lib; {
            description = "Google Calendar weekly widget (Astal4 + GJS)";
            homepage = "https://github.com/peteyycz/caldy";
            platforms = platforms.linux;
            mainProgram = "caldy";
          };
        }
      ) { };

      apps.${system}.default = {
        type = "app";
        program = "${self.packages.${system}.default}/bin/caldy";
      };

      homeManagerModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.programs.caldy;
          basePackage = self.packages.${pkgs.system}.default;
        in {
          options.programs.caldy = {
            enable = lib.mkEnableOption "caldy — Google Calendar weekly widget";
            clientId = lib.mkOption {
              type = lib.types.str;
              default = defaultClientId;
              defaultText = lib.literalMD "caldy's shared desktop OAuth client_id";
              description = ''
                Google OAuth desktop client_id baked into the binary.
                Defaults to caldy's shared desktop client — override if you
                prefer to use your own Google Cloud project.
              '';
            };
            clientSecret = lib.mkOption {
              type = lib.types.str;
              default = defaultClientSecret;
              defaultText = lib.literalMD "caldy's shared desktop OAuth client_secret";
              description = ''
                Google OAuth desktop client_secret baked into the binary.
                Desktop OAuth clients are "public" per Google's spec — this
                value is not truly secret. Defaults to caldy's shared
                desktop client.
              '';
            };
            package = lib.mkOption {
              type = lib.types.package;
              default = basePackage.override {
                inherit (cfg) clientId clientSecret;
              };
              defaultText = lib.literalExpression
                "caldy.packages.\${pkgs.system}.default.override { inherit clientId clientSecret; }";
              description = "The caldy package to install.";
            };
            settings = lib.mkOption {
              type = (pkgs.formats.toml { }).type;
              default = { };
              example = lib.literalExpression ''
                {
                  week = {
                    show_weekend = true;
                    start_day = "monday";
                  };
                  theme = {
                    bg = "#1a1b1f";
                    accent = "#4285f4";
                  };
                }
              '';
              description = ''
                Contents of $XDG_CONFIG_HOME/caldy/config.toml. When non-empty,
                home-manager manages the file — do not hand-edit it. See
                caldy's README for the supported keys.
              '';
            };
          };

          config = lib.mkIf cfg.enable {
            home.packages = [ cfg.package ];

            xdg.configFile."caldy/config.toml" = lib.mkIf (cfg.settings != { }) {
              source = (pkgs.formats.toml { }).generate "caldy-config.toml" cfg.settings;
            };

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
          pkgs.libsecret
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
