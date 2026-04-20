import { Gtk } from "ags/gtk4";

import { GCalCalendar } from "../services/CalendarClient.js";
import { colorFor } from "../util/colors.js";

interface Props {
  calendars: GCalCalendar[];
  hiddenIds: string[];
  onToggle: (calendarId: string) => void;
  onAddAccount: () => void;
}

export default function CalendarBar({
  calendars,
  hiddenIds,
  onToggle,
  onAddAccount,
}: Props) {
  const seen = new Set<string>();
  const unique = calendars.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      class="calendar-bar"
      spacing={6}
    >
      <scrolledwindow
        hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        vscrollbarPolicy={Gtk.PolicyType.NEVER}
        hexpand
      >
        <box orientation={Gtk.Orientation.HORIZONTAL} spacing={6}>
          {unique.map((cal) => {
            const hidden = hiddenIds.includes(cal.id);
            const color = colorFor(cal.id, cal.backgroundColor);
            const klass = hidden
              ? "calendar-toggle hidden"
              : "calendar-toggle";
            return (
              <button class={klass} onClicked={() => onToggle(cal.id)}>
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={6}>
                  <box class="calendar-dot" css={`background: ${color};`} />
                  <label label={cal.summary ?? "(untitled)"} />
                </box>
              </button>
            );
          })}
        </box>
      </scrolledwindow>
      <button class="add-account" onClicked={onAddAccount} label="+" />
    </box>
  );
}
