import { Gtk } from "ags/gtk4";

export default function LoadingView() {
  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      class="loading-view"
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      hexpand
      spacing={12}
    >
      <Gtk.Spinner spinning heightRequest={32} widthRequest={32} />
      <label class="loading-label" label="Loading events…" />
    </box>
  );
}
