import { Gtk } from "ags/gtk4";

import { formatRange } from "../util/week.js";

interface Props {
  weekStart: Date;
  weekLength: number;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

export default function Header({
  weekStart,
  weekLength,
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
        label={formatRange(weekStart, weekLength)}
      />
      <button class="nav" onClicked={onPrev} label="‹" />
      <button class="nav" onClicked={onToday} label="Today" />
      <button class="nav" onClicked={onNext} label="›" />
    </box>
  );
}
