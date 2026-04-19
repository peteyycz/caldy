import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { parse as parseToml } from "smol-toml";

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WeekLength = 5 | 7;

export interface ThemeConfig {
  bg: string;
  surface: string;
  surface_hi: string;
  fg: string;
  fg_muted: string;
  accent: string;
  danger: string;
}

export const THEME_KEYS: readonly (keyof ThemeConfig)[] = [
  "bg",
  "surface",
  "surface_hi",
  "fg",
  "fg_muted",
  "accent",
  "danger",
] as const;

export const DEFAULT_THEME: ThemeConfig = {
  bg: "#1a1b1f",
  surface: "#24262d",
  surface_hi: "#2a2d36",
  fg: "#e6e8ee",
  fg_muted: "#9aa0ad",
  accent: "#4285f4",
  danger: "#ea4335",
};

export interface Settings {
  weekLength: WeekLength;
  weekStartDay: WeekStartDay;
  theme: ThemeConfig;
}

export const DEFAULT_SETTINGS: Settings = {
  weekLength: 7,
  weekStartDay: 1,
  theme: { ...DEFAULT_THEME },
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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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

function parseHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return HEX_RE.test(v) ? v.toLowerCase() : null;
}

function parseTheme(raw: unknown): ThemeConfig {
  const theme: ThemeConfig = { ...DEFAULT_THEME };
  if (!raw || typeof raw !== "object") return theme;
  const obj = raw as Record<string, unknown>;
  for (const key of THEME_KEYS) {
    if (!(key in obj)) continue;
    const parsed = parseHex(obj[key]);
    if (parsed) {
      theme[key] = parsed;
    } else {
      console.warn(
        `caldy: invalid theme.${key} value, falling back to default`,
      );
    }
  }
  return theme;
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
      theme?: unknown;
    };
    const week = parsed.week ?? {};
    return {
      weekLength: parseLength(week.length) ?? DEFAULT_SETTINGS.weekLength,
      weekStartDay:
        parseStartDay(week.start_day) ?? DEFAULT_SETTINGS.weekStartDay,
      theme: parseTheme(parsed.theme),
    };
  } catch (err) {
    console.error("caldy: failed to parse config.toml", err);
    return { ...DEFAULT_SETTINGS };
  }
}
