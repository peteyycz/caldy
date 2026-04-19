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

## Configuration

Optional settings live at `$XDG_CONFIG_HOME/caldy/config.toml`. If the file is
missing, defaults apply (7-day week, Monday start). Template:

```toml
[week]
length = 7              # 5 (Mon–Fri work week) or 7 (full week)
start_day = "monday"    # day name ("sunday".."saturday") or 0–6 (0 = Sunday)
```

See `config.example.toml` in the repo for a copy-pasteable version.

## Data

- Scope: `https://www.googleapis.com/auth/calendar` (read-write, so future
  edit/create features don't require re-consent).
- Events are fetched from every non-hidden calendar in your calendar list and
  color-coded by each calendar's own `backgroundColor` field.
- Recurring events are expanded server-side (`singleEvents=true`).
