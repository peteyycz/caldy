import GLib from "gi://GLib";
import Gio from "gi://Gio";

export interface Tokens {
  id: string;
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

export function newAccountId(): string {
  return GLib.uuid_string_random();
}

export function loadAccounts(): Tokens[] {
  const file = Gio.File.new_for_path(tokensPath());
  if (!file.query_exists(null)) return [];
  const [ok, contents] = file.load_contents(null);
  if (!ok) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(contents));
  } catch {
    return [];
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list
    .filter((t): t is Tokens =>
      !!t && typeof t === "object"
      && typeof (t as any).access_token === "string"
      && typeof (t as any).refresh_token === "string",
    )
    .map((t) => ({ ...t, id: typeof t.id === "string" ? t.id : newAccountId() }));
}

export function saveAccounts(accounts: Tokens[]): void {
  const path = tokensPath();
  ensureParentDir(path);
  const file = Gio.File.new_for_path(path);
  const bytes = encoder.encode(JSON.stringify(accounts, null, 2));
  file.replace_contents(bytes, null, false, Gio.FileCreateFlags.PRIVATE, null);
}

export function clearAccounts(): void {
  const file = Gio.File.new_for_path(tokensPath());
  if (file.query_exists(null)) file.delete(null);
}
