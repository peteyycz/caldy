import { Gtk } from "ags/gtk4";

import { formatRange } from "../util/week.js";

interface Props {
  weekStart: Date;
  showWeekend: boolean;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

export default function Header({
  weekStart,
  showWeekend,
  onPrev,
  onToday,
  onNext,
}: Props) {
  return (
    <box orientation={Gtk.Orientation.HORIZONTAL} class="header" spacing={8}>
      <label
        class="range"
        xalign={0}
        hexpand
        label={formatRange(weekStart, showWeekend)}
      />
      <button class="nav" onClicked={onPrev} label="‹" />
      <button class="nav" onClicked={onToday} label="Today" />
      <button class="nav" onClicked={onNext} label="›" />
    </box>
  );
}
