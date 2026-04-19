import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { parse as parseToml } from "smol-toml";

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WeekLength = 5 | 7;

export interface Settings {
  weekLength: WeekLength;
  weekStartDay: WeekStartDay;
}

export const DEFAULT_SETTINGS: Settings = {
  weekLength: 7,
  weekStartDay: 1,
};

const DAY_NAMES: Record<string, WeekStartDay> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const decoder = new TextDecoder("utf-8");

function configPath(): string {
  return GLib.build_filenamev([
    GLib.get_user_config_dir(),
    "caldy",
    "config.toml",
  ]);
}

function parseStartDay(v: unknown): WeekStartDay | null {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6) {
    return v as WeekStartDay;
  }
  if (typeof v === "string") {
    const n = DAY_NAMES[v.toLowerCase()];
    if (n !== undefined) return n;
  }
  return null;
}

function parseLength(v: unknown): WeekLength | null {
  if (v === 5 || v === 7) return v;
  return null;
}

export function loadSettings(): Settings {
  const path = configPath();
  const file = Gio.File.new_for_path(path);
  if (!file.query_exists(null)) return { ...DEFAULT_SETTINGS };

  try {
    const [ok, contents] = file.load_contents(null);
    if (!ok) return { ...DEFAULT_SETTINGS };
    const text = decoder.decode(contents);
    const parsed = parseToml(text) as {
      week?: { length?: unknown; start_day?: unknown };
    };
    const week = parsed.week ?? {};
    return {
      weekLength: parseLength(week.length) ?? DEFAULT_SETTINGS.weekLength,
      weekStartDay:
        parseStartDay(week.start_day) ?? DEFAULT_SETTINGS.weekStartDay,
    };
  } catch (err) {
    console.error("caldy: failed to parse config.toml", err);
    return { ...DEFAULT_SETTINGS };
  }
}
