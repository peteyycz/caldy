import GLib from "gi://GLib";
import Gio from "gi://Gio";

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

function tokensPath(): string {
  return GLib.build_filenamev([GLib.get_user_config_dir(), "caldy", "tokens.json"]);
}

function ensureParentDir(path: string) {
  const parent = Gio.File.new_for_path(path).get_parent();
  if (parent && !parent.query_exists(null)) {
    parent.make_directory_with_parents(null);
  }
}

export function loadTokens(): Tokens | null {
  const file = Gio.File.new_for_path(tokensPath());
  if (!file.query_exists(null)) return null;
  const [ok, contents] = file.load_contents(null);
  if (!ok) return null;
  try {
    return JSON.parse(decoder.decode(contents)) as Tokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: Tokens): void {
  const path = tokensPath();
  ensureParentDir(path);
  const file = Gio.File.new_for_path(path);
  const bytes = encoder.encode(JSON.stringify(tokens, null, 2));
  file.replace_contents(bytes, null, false, Gio.FileCreateFlags.PRIVATE, null);
}

export function clearTokens(): void {
  const file = Gio.File.new_for_path(tokensPath());
  if (file.query_exists(null)) file.delete(null);
}
