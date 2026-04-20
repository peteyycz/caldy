# caldy

A desktop widget that renders a unified weekly view of all your Google Calendars.
Built with [Astal4](https://aylur.github.io/libastal/astal4/), GJS, and Gnim-powered
JSX components. No backend — the widget calls the Google Calendar API directly
using OAuth 2.0 with a loopback redirect.

## Prerequisites

- Nix with flakes enabled
- A wlroots-based Wayland compositor (Hyprland, Sway, river, ...) — the widget
  uses `gtk4-layer-shell` to anchor itself as an overlay
- A Google Cloud project with the Google Calendar API enabled and an OAuth
  client of type **Desktop app**

## Setup

1. Enter the dev shell:
   ```sh
   nix develop
   ```

   Or, with [direnv](https://direnv.net/) installed, the shipped `.envrc`
   (`use flake`) loads the environment automatically:
   ```sh
   direnv allow
   ```

2. Generate GObject type bindings (once, after entering the shell):
   ```sh
   npm run types
   ```

3. Create OAuth credentials at <https://console.cloud.google.com/apis/credentials>
   → **Create credentials** → **OAuth client ID** → **Desktop app**. Enable the
   Google Calendar API for the same project.

4. For local development (`npm run dev`), export the credentials:
   ```sh
   export CALDY_GOOGLE_CLIENT_ID='...apps.googleusercontent.com'
   export CALDY_GOOGLE_CLIENT_SECRET='...'
   ```
   The easiest home for these is `.envrc.local` (already git-ignored)
   alongside the shipped `.envrc`. These env vars are only consulted when
   the binary wasn't built through Nix with embedded credentials (see
   **Providing OAuth credentials** below for the Nix path).

## Running

```sh
npm run dev
```

On first launch, the widget shows a **Sign in with Google** button. Clicking
it opens your default browser for consent; once Google redirects back to the
loopback listener, tokens are persisted at
`$XDG_CONFIG_HOME/caldy/tokens.json` and the weekly view appears.

## Build

```sh
npm run build
# produces ./dist/caldy — a single executable bundle
```

A dev-shell `npm run build` leaves the credential placeholder tokens in
`src/services/Config.ts` untouched — the resulting binary falls back to the
`CALDY_GOOGLE_CLIENT_ID` / `CALDY_GOOGLE_CLIENT_SECRET` env vars at runtime.
For a binary with credentials baked in, use `nix build` with overrides (see
**Providing OAuth credentials** below).

## Install via Nix

Try it ad-hoc:

```sh
nix run github:peteyycz/caldy
```

Install into your user profile:

```sh
nix profile install github:peteyycz/caldy
```

Declarative install (flake input). Add caldy to your system flake's inputs
and reference the package wherever you install user apps:

```nix
{
  inputs.caldy = {
    url = "github:peteyycz/caldy";
    inputs.nixpkgs.follows = "nixpkgs";
  };
}
```

Then, in a NixOS module:

```nix
environment.systemPackages = [ inputs.caldy.packages.x86_64-linux.default ];
```

or in a home-manager module:

```nix
home.packages = [ inputs.caldy.packages.x86_64-linux.default ];
```

### Providing OAuth credentials

caldy's `client_id` and `client_secret` are baked into the binary at build
time. The flake exposes `clientId` and `clientSecret` as package arguments
(both default to empty strings). A binary built without overrides will
still launch, but sign-in throws a "Missing Google OAuth credentials"
error unless the `CALDY_GOOGLE_CLIENT_ID` / `CALDY_GOOGLE_CLIENT_SECRET`
env vars are set at runtime.

Ad-hoc local build:

```sh
nix build --impure --expr \
  'let f = builtins.getFlake (toString ./.);
   in f.packages.x86_64-linux.default.override {
        clientId     = "XXX.apps.googleusercontent.com";
        clientSecret = "YYY";
      }'
```

(`nix build --override-input` only overrides flake *inputs*, not package
arguments — hence the `--impure` expression form.)

Consuming the flake:

```nix
inputs.caldy.packages.x86_64-linux.default.override {
  clientId     = "XXX.apps.googleusercontent.com";
  clientSecret = "YYY";
}
```

Via the home-manager module (preferred — see next section):

```nix
programs.caldy = {
  enable       = true;
  clientId     = "XXX.apps.googleusercontent.com";
  clientSecret = "YYY";
};
```

#### Why it's OK to embed the "secret"

Google classifies desktop OAuth clients as "public clients" — the
`client_secret` authenticates the *application* to Google, not the user,
and PKCE protects the authorization-code exchange. Committing this pair
into a private config repo or baking it into a Nix-built binary is the
expected Google-approved pattern for desktop apps. Don't publish it in
public repos all the same.

### Autostart via home-manager

For a home-manager setup, caldy also ships a module that installs the
package and registers a user systemd service tied to
`graphical-session.target` — it starts with your compositor and restarts
on crash:

```nix
{
  imports = [ inputs.caldy.homeManagerModules.default ];
  programs.caldy.enable = true;
}
```

Check it after rebuilding with:

```sh
systemctl --user status caldy
journalctl --user -u caldy -f
```

Note: the service expects your compositor to have activated
`graphical-session.target` (Hyprland/Sway/river with systemd integration
do this automatically; bare setups may need `systemctl --user start
graphical-session.target` from your compositor's exec-once).

### Binding toggle on Hyprland

The `caldy` binary is its own client: running it with no arguments starts
the widget (which is what the systemd service does), and running it with
arguments while an instance is already live forwards them over DBus to
that instance via `Gio.ApplicationFlags.HANDLES_COMMAND_LINE`. So:

```sh
caldy toggle    # show/hide
caldy show      # force show
caldy hide      # force hide
caldy refresh   # re-fetch events from Google
```

Bind toggle to `Super+C` in your Hyprland config:

```
bind = SUPER, C, exec, caldy toggle
```

If you configure Hyprland via home-manager, add it declaratively:

```nix
wayland.windowManager.hyprland.settings.bind = [
  "SUPER, C, exec, caldy toggle"
];
```

Sway/river use the same `caldy toggle` command — only the bind syntax
changes (`bindsym $mod+c exec …` for sway, `riverctl map …` for river).

## Configuration

Optional settings live at `$XDG_CONFIG_HOME/caldy/config.toml`. If the file is
missing, defaults apply (weekend shown, Monday start, built-in dark palette).

```toml
[week]
show_weekend = true     # false = hide Sat/Sun, true = full week
start_day = "monday"    # day name ("sunday".."saturday") or 0–6 (0 = Sunday)

[theme]
# All keys optional; missing ones keep the built-in dark defaults.
bg         = "#1a1b1f"  # window background
surface    = "#24262d"  # day columns, nav buttons
surface_hi = "#2a2d36"  # today column, event chips, nav button hover
fg         = "#e6e8ee"  # primary text
fg_muted   = "#9aa0ad"  # secondary text, day headers
accent     = "#4285f4"  # primary action / today highlight
danger     = "#ea4335"  # errors, close-button hover
```

Invalid hex values are skipped (fall back to the default for that key) and
logged; valid keys still apply.

See `config.example.toml` in the repo for a copy-pasteable version with a
Gruvbox-dark example `[theme]` block.

### Declarative config via home-manager

The home-manager module also exposes `programs.caldy.settings` — a typed
attrset serialized to `$XDG_CONFIG_HOME/caldy/config.toml` for you:

```nix
programs.caldy = {
  enable       = true;
  clientId     = "XXX.apps.googleusercontent.com";
  clientSecret = "YYY";
  settings = {
    week = {
      show_weekend = true;
      start_day    = "monday";
    };
    theme = {
      bg         = "#1a1b1f";
      accent     = "#4285f4";
    };
  };
};
```

When `settings` is non-empty, home-manager owns the file — don't hand-edit
`~/.config/caldy/config.toml` or the next `home-manager switch` will refuse
to overwrite it. Leave `settings = { };` (the default) to manage the file
manually.

## Data

- Scope: `https://www.googleapis.com/auth/calendar` (read-write, so future
  edit/create features don't require re-consent).
- Events are fetched from every non-hidden calendar in your calendar list and
  color-coded by each calendar's own `backgroundColor` field.
- Recurring events are expanded server-side (`singleEvents=true`).
