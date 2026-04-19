import { Gtk } from "ags/gtk4";

import {
  GCalCalendar,
  GCalEvent,
  eventStart,
  isAllDay,
} from "../services/CalendarClient.js";
import { colorFor } from "../util/colors.js";
import { formatHM } from "../util/week.js";

interface Props {
  event: GCalEvent;
  calendar?: GCalCalendar;
}

export default function EventChip({ event, calendar }: Props) {
  const color = colorFor(event.calendarId, calendar?.backgroundColor);
  const title = event.summary ?? "(untitled)";
  const time = isAllDay(event) ? "all day" : formatHM(eventStart(event));

  return (
    <box
      class="event-chip"
      orientation={Gtk.Orientation.VERTICAL}
      css={`border-left: 4px solid ${color};`}
      spacing={2}
    >
      <label class="event-time" xalign={0} label={time} />
      <label class="event-title" xalign={0} wrap label={title} />
    </box>
  );
}
