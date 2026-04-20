export type DayKey = string;

export function startOfWeek(date: Date, startDay: number = 1): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day - startDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function endOfWeek(weekStart: Date): Date {
  return addDays(weekStart, 7);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function weekDays(weekStart: Date, showWeekend: boolean = true): Date[] {
  const full = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  if (showWeekend) return full;
  return full.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
}

export function dayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatHM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatRange(weekStart: Date, showWeekend: boolean = true): string {
  const days = weekDays(weekStart, showWeekend);
  const first = days[0];
  const last = days[days.length - 1];
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(first)} – ${fmt.format(last)}`;
}

export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
  }).format(date);
}
