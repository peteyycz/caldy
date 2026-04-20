import { Gtk } from "ags/gtk4";

import { GCalCalendar, GCalEvent, eventStart } from "../services/CalendarClient.js";
import { formatWeekday } from "../util/week.js";
import EventChip from "./EventChip.js";

interface Props {
  day: Date;
  events: GCalEvent[];
  calendarsById: Map<string, GCalCalendar>;
  isToday: boolean;
}

export default function DayColumn({ day, events, calendarsById, isToday }: Props) {
  const now = Date.now();
  const splitIndex = isToday
    ? (() => {
        const i = events.findIndex((ev) => eventStart(ev).getTime() > now);
        return i === -1 ? events.length : i;
      })()
    : -1;

  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      class={isToday ? "day-column day-today" : "day-column"}
      hexpand
      spacing={6}
    >
      <label class="day-header" xalign={0} label={formatWeekday(day)} />
      <scrolledwindow
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        propagateNaturalHeight
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          {events.length === 0 ? (
            <label class="day-empty" xalign={0} label="—" />
          ) : (
            [
              ...events.slice(0, splitIndex).map((ev) => (
                <EventChip event={ev} calendar={calendarsById.get(ev.calendarId)} />
              )),
              ...(isToday ? [<box class="now-indicator" hexpand />] : []),
              ...events.slice(splitIndex).map((ev) => (
                <EventChip event={ev} calendar={calendarsById.get(ev.calendarId)} />
              )),
            ]
          )}
        </box>
      </scrolledwindow>
    </box>
  );
}
