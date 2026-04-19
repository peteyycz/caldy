const FALLBACK_PALETTE = [
  "#4285f4", "#34a853", "#fbbc04", "#ea4335",
  "#a142f4", "#24c1e0", "#f4511e", "#795548",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorFor(calendarId: string, provided?: string | null): string {
  if (provided && /^#[0-9a-fA-F]{6}$/.test(provided)) return provided;
  return FALLBACK_PALETTE[hash(calendarId) % FALLBACK_PALETTE.length];
}
