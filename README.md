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

4. Drop the credentials into `$XDG_CONFIG_HOME/caldy/env.json`
   (usually `~/.config/caldy/env.json`):
   ```sh
   mkdir -p ~/.config/caldy
   cp env.example.json ~/.config/caldy/env.json
   $EDITOR ~/.config/caldy/env.json
   ```
   Alternatively, export `CALDY_GOOGLE_CLIENT_ID` and
   `CALDY_GOOGLE_CLIENT_SECRET` before launching.

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

The same OAuth credentials setup in `~/.config/caldy/env.json` (or the
`CALDY_GOOGLE_CLIENT_ID` / `CALDY_GOOGLE_CLIENT_SECRET` env vars) is still
required on first run.

## Configuration

Optional settings live at `$XDG_CONFIG_HOME/caldy/config.toml`. If the file is
missing, defaults apply (7-day week, Monday start, built-in dark palette).

```toml
[week]
length = 7              # 5 (Mon–Fri work week) or 7 (full week)
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

## Data

- Scope: `https://www.googleapis.com/auth/calendar` (read-write, so future
  edit/create features don't require re-consent).
- Events are fetched from every non-hidden calendar in your calendar list and
  color-coded by each calendar's own `backgroundColor` field.
- Recurring events are expanded server-side (`singleEvents=true`).
