import app from "ags/gtk4/app";

import { CalendarClient } from "./services/CalendarClient.js";
import { authorize, loadPersistedTokens } from "./services/OAuth.js";
import { appState, patch } from "./state/appState.js";
import Window, {
  setWindowVisible,
  toggleWindow,
  windowRef,
} from "./widgets/Window.js";

import style from "./style.scss";

let client: CalendarClient | null = null;

async function refreshEvents() {
  if (!client) return;
  const { weekStart } = appState.get();
  patch({ loading: true, error: null });
  try {
    const calendars = await client.listCalendars();
    const events = await client.fetchWeek(calendars, weekStart);
    patch({
      calendars,
      events,
      tokens: client.getTokens(),
      loading: false,
    });
  } catch (err) {
    console.error("refreshEvents failed", err);
    patch({
      loading: false,
      error: (err as Error).message,
    });
  }
}

async function signIn() {
  patch({ loading: true, error: null });
  try {
    const tokens = await authorize();
    client = new CalendarClient(tokens);
    patch({ tokens });
    await refreshEvents();
  } catch (err) {
    console.error("sign-in failed", err);
    patch({
      loading: false,
      error: (err as Error).message,
    });
  }
}

async function bootstrap() {
  const persisted = loadPersistedTokens();
  if (persisted) {
    client = new CalendarClient(persisted);
    patch({ tokens: persisted });
    await refreshEvents();
  }
}

app.start({
  instanceName: "caldy",
  css: style,
  requestHandler(argv, res) {
    const cmd = (argv[0] ?? "").trim();
    console.log(
      `caldy: request cmd="${cmd}" ref=${windowRef ? "yes" : "no"} ` +
        `app_windows=[${app.windows.map((w) => w.name).join(",")}]`,
    );
    switch (cmd) {
      case "toggle":
        toggleWindow();
        return res(windowRef?.visible ? "shown" : "hidden");
      case "show":
        setWindowVisible(true);
        return res("shown");
      case "hide":
        setWindowVisible(false);
        return res("hidden");
      case "refresh":
        void refreshEvents();
        return res("refreshing");
      default:
        return res(`unknown request: ${argv.join(" ")}`);
    }
  },
  main() {
    Window({
      onSignIn: () => void signIn(),
      onWeekChange: () => void refreshEvents(),
    });
    void bootstrap();
  },
});
