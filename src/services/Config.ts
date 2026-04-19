import GLib from "gi://GLib";
import Gio from "gi://Gio";

export interface OAuthConfig {
  client_id: string;
  client_secret: string;
}

const decoder = new TextDecoder("utf-8");

function configFilePath(): string {
  return GLib.build_filenamev([GLib.get_user_config_dir(), "caldy", "env.json"]);
}

function readJsonFile(path: string): OAuthConfig | null {
  const file = Gio.File.new_for_path(path);
  if (!file.query_exists(null)) return null;
  const [ok, contents] = file.load_contents(null);
  if (!ok) return null;
  try {
    return JSON.parse(decoder.decode(contents)) as OAuthConfig;
  } catch {
    return null;
  }
}

export function loadConfig(): OAuthConfig {
  const fromFile = readJsonFile(configFilePath());
  if (fromFile?.client_id && fromFile?.client_secret) return fromFile;

  const envId = GLib.getenv("CALDY_GOOGLE_CLIENT_ID");
  const envSecret = GLib.getenv("CALDY_GOOGLE_CLIENT_SECRET");
  if (envId && envSecret) {
    return { client_id: envId, client_secret: envSecret };
  }

  throw new Error(
    `Missing Google OAuth credentials. Create ${configFilePath()} ` +
    `or set CALDY_GOOGLE_CLIENT_ID and CALDY_GOOGLE_CLIENT_SECRET.`,
  );
}
