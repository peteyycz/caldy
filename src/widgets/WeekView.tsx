import { Gtk } from "ags/gtk4";

import { GCalCalendar, GCalEvent } from "../services/CalendarClient.js";
import { dayKey, weekDays } from "../util/week.js";
import DayColumn from "./DayColumn.js";

interface Props {
  weekStart: Date;
  weekLength: number;
  events: GCalEvent[];
  calendars: GCalCalendar[];
}

export default function WeekView({
  weekStart,
  weekLength,
  events,
  calendars,
}: Props) {
  const days = weekDays(weekStart, weekLength);
  const todayKey = dayKey(new Date());

  const calendarsById = new Map(calendars.map((c) => [c.id, c]));
  const byDay = new Map<string, GCalEvent[]>();
  for (const day of days) byDay.set(dayKey(day), []);
  for (const ev of events) {
    const start = ev.start.dateTime
      ? new Date(ev.start.dateTime)
      : ev.start.date
        ? new Date(`${ev.start.date}T00:00:00`)
        : null;
    if (!start) continue;
    const key = dayKey(start);
    byDay.get(key)?.push(ev);
  }

  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      class="week-view"
      spacing={8}
      hexpand
    >
      {days.map((day) => (
        <DayColumn
          day={day}
          events={byDay.get(dayKey(day)) ?? []}
          calendarsById={calendarsById}
          isToday={dayKey(day) === todayKey}
        />
      ))}
    </box>
  );
}
