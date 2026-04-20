import { With } from "gnim";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";

import { appState, patch, toggleCalendarVisibility } from "../state/appState.js";
import { addDays, startOfWeek } from "../util/week.js";
import AuthPrompt from "./AuthPrompt.js";
import CalendarBar from "./CalendarBar.js";
import Header from "./Header.js";
import LoadingView from "./LoadingView.js";
import WeekView from "./WeekView.js";

interface Props {
  onSignIn: () => void;
  onAddAccount: () => void;
  onWeekChange: () => void;
}

const WINDOW_NAME = "caldy";

export let windowRef: Astal.Window | null = null;

export function setWindowVisible(visible: boolean) {
  if (windowRef) windowRef.visible = visible;
}

export function toggleWindow() {
  if (windowRef) windowRef.visible = !windowRef.visible;
}

function closeWindow() {
  console.log("caldy: close triggered");
  const byRef = windowRef;
  const byLookup = app.get_window(WINDOW_NAME);
  console.log(`caldy: windowRef=${byRef ? "yes" : "no"} lookup=${byLookup ? "yes" : "no"}`);
  const win = byRef ?? byLookup ?? null;
  if (!win) {
    console.log("caldy: no window to close");
    return;
  }
  console.log(`caldy: visible before=${win.visible}`);
  win.visible = false;
  console.log(`caldy: visible after=${win.visible}`);
}

function onWindowMount(win: Astal.Window) {
  console.log("caldy: window mount; name=", win.name);
  windowRef = win;

  const kc = new Gtk.EventControllerKey();
  kc.connect("key-pressed", (_c, keyval: number) => {
    console.log(`caldy: key pressed keyval=${keyval}`);
    if (keyval === Gdk.KEY_Escape) {
      closeWindow();
      return true;
    }
    return false;
  });
  win.add_controller(kc);
}

export default function Window({ onSignIn, onAddAccount, onWeekChange }: Props) {
  const shiftWeek = (direction: 1 | -1) => {
    const s = appState.get();
    patch({ weekStart: addDays(s.weekStart, direction * 7) });
    onWeekChange();
  };

  const goToday = () => {
    const s = appState.get();
    patch({ weekStart: startOfWeek(new Date(), s.weekStartDay) });
    onWeekChange();
  };

  return (
    <window
      visible={false}
      name={WINDOW_NAME}
      class="caldy-window"
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      widthRequest={880}
      heightRequest={500}
      $={onWindowMount}
    >
      <box orientation={Gtk.Orientation.VERTICAL} class="root" spacing={8}>
        <With value={appState}>
          {(s) =>
            s.accounts.length === 0 ? (
              <AuthPrompt
                error={s.error}
                loading={s.loading}
                onSignIn={onSignIn}
              />
            ) : (
              <box orientation={Gtk.Orientation.VERTICAL} spacing={8} hexpand vexpand>
                <Header
                  weekStart={s.weekStart}
                  showWeekend={s.showWeekend}
                  onPrev={() => shiftWeek(-1)}
                  onToday={goToday}
                  onNext={() => shiftWeek(1)}
                />
                {s.error ? (
                  <label class="banner-error" wrap label={s.error} />
                ) : null}
                {s.loading ? (
                  <LoadingView />
                ) : (
                  <WeekView
                    weekStart={s.weekStart}
                    showWeekend={s.showWeekend}
                    events={s.events}
                    calendars={s.calendars}
                    hiddenCalendarIds={s.hiddenCalendarIds}
                  />
                )}
                <CalendarBar
                  calendars={s.calendars}
                  hiddenIds={s.hiddenCalendarIds}
                  onToggle={toggleCalendarVisibility}
                  onAddAccount={onAddAccount}
                />
              </box>
            )
          }
        </With>
      </box>
    </window>
  );
}
