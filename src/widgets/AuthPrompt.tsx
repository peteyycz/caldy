import { Gtk } from "ags/gtk4";

interface Props {
  error: string | null;
  loading: boolean;
  onSignIn: () => void;
}

export default function AuthPrompt({ error, loading, onSignIn }: Props) {
  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      class="auth-prompt"
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      hexpand
      vexpand
      spacing={16}
    >
      <label class="auth-title" label="caldy" />
      <label
        class="auth-subtitle"
        label="Connect your Google Calendars to see a weekly overview."
        wrap
      />
      <button
        class="auth-button"
        sensitive={!loading}
        onClicked={onSignIn}
        label={loading ? "Waiting for browser…" : "Sign in with Google"}
      />
      {error ? <label class="auth-error" wrap label={error} /> : null}
    </box>
  );
}
