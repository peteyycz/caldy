import GLib from "gi://GLib";

// Rewritten by Nix at build time via substituteInPlace in flake.nix.
// The tokens must remain unique in this file; `--replace-fail` errors
// if they aren't found.
export const CLIENT_ID = "__CALDY_CLIENT_ID__";
export const CLIENT_SECRET = "__CALDY_CLIENT_SECRET__";

// Dev-shell builds leave the "__CALDY_…" placeholder intact; Nix builds
// with default empty args substitute them to "". Both cases fall through
// to the env-var fallback. Comparing against the full placeholder token
// would be self-defeating — Nix would rewrite both sides.
function notInjected(v: string): boolean {
  return v === "" || v.startsWith("__CALDY_");
}

export function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = notInjected(CLIENT_ID)
    ? (GLib.getenv("CALDY_GOOGLE_CLIENT_ID") ?? "")
    : CLIENT_ID;
  const clientSecret = notInjected(CLIENT_SECRET)
    ? (GLib.getenv("CALDY_GOOGLE_CLIENT_SECRET") ?? "")
    : CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth credentials. " +
      "Nix build: `.override { clientId = \"...\"; clientSecret = \"...\"; }`. " +
      "Dev shell: export CALDY_GOOGLE_CLIENT_ID and CALDY_GOOGLE_CLIENT_SECRET " +
      "(e.g., in .envrc.local).",
    );
  }
  return { clientId, clientSecret };
}
