import { Gtk } from "ags/gtk4";

import { GCalCalendar, GCalEvent } from "../services/CalendarClient.js";
import { formatWeekday } from "../util/week.js";
import EventChip from "./EventChip.js";

interface Props {
  day: Date;
  events: GCalEvent[];
  calendarsById: Map<string, GCalCalendar>;
  isToday: boolean;
}

export default function DayColumn({ day, events, calendarsById, isToday }: Props) {
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
            events.map((ev) => (
              <EventChip event={ev} calendar={calendarsById.get(ev.calendarId)} />
            ))
          )}
        </box>
      </scrolledwindow>
    </box>
  );
}
