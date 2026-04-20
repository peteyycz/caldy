import app from "ags/gtk4/app";

import { CalendarClient, GCalCalendar, GCalEvent } from "./services/CalendarClient.js";
import { authorize, loadPersistedAccounts } from "./services/OAuth.js";
import { loadSettings } from "./services/Settings.js";
import { generateThemeCss } from "./services/Theme.js";
import { saveAccounts, Tokens } from "./services/TokenStore.js";
import { applySettings, appState, patch } from "./state/appState.js";
import Window, {
  setWindowVisible,
  toggleWindow,
  windowRef,
} from "./widgets/Window.js";

import style from "./style.scss";

const clients = new Map<string, CalendarClient>();

function currentAccounts(): Tokens[] {
  return [...clients.values()].map((c) => c.getTokens());
}

function persistAccounts(): Promise<void> {
  return saveAccounts(currentAccounts());
}

async function fetchForClient(
  client: CalendarClient,
  weekStart: Date,
): Promise<{ calendars: GCalCalendar[]; events: GCalEvent[] }> {
  const calendars = await client.listCalendars();
  const events = await client.fetchWeek(calendars, weekStart, 7);
  return { calendars, events };
}

async function refreshEvents() {
  if (clients.size === 0) return;
  const { weekStart } = appState.get();
  patch({ loading: true, error: null });
  try {
    const results = await Promise.all(
      [...clients.values()].map((c) => fetchForClient(c, weekStart)),
    );
    const calendars = results.flatMap((r) => r.calendars);
    const seen = new Set<string>();
    const events = results
      .flatMap((r) => r.events)
      .filter((e) => {
        const key = `${e.calendarId}:${e.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const sa = a.start.dateTime ?? a.start.date ?? "";
        const sb = b.start.dateTime ?? b.start.date ?? "";
        return sa.localeCompare(sb);
      });
    await persistAccounts();
    patch({
      calendars,
      events,
      accounts: currentAccounts(),
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

async function addAccount() {
  patch({ loading: true, error: null });
  try {
    const tokens = await authorize();
    const client = new CalendarClient(tokens);
    clients.set(tokens.id, client);
    await persistAccounts();
    patch({ accounts: currentAccounts() });
    await refreshEvents();
  } catch (err) {
    console.error("sign-in failed", err);
    patch({
      loading: false,
      error: (err as Error).message,
    });
  }
}

function loadAndApplySettings() {
  const settings = loadSettings();
  applySettings(settings);
  app.apply_css(generateThemeCss(settings.theme));
  app.apply_css(style);
}

async function restoreSession() {
  try {
    const persisted = await loadPersistedAccounts();
    if (persisted.length === 0) return;
    for (const tokens of persisted) {
      clients.set(tokens.id, new CalendarClient(tokens));
    }
    patch({ accounts: persisted });
    await refreshEvents();
  } catch (err) {
    console.error("restoreSession failed", err);
    patch({ error: (err as Error).message });
  }
}

app.start({
  instanceName: "caldy",
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
    loadAndApplySettings();
    Window({
      onSignIn: () => void addAccount(),
      onAddAccount: () => void addAccount(),
      onWeekChange: () => void refreshEvents(),
    });
    void restoreSession();
  },
});
