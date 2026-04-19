import { createState } from "ags";

import { GCalCalendar, GCalEvent } from "../services/CalendarClient.js";
import {
  DEFAULT_SETTINGS,
  Settings,
  WeekLength,
  WeekStartDay,
} from "../services/Settings.js";
import { Tokens } from "../services/TokenStore.js";
import { startOfWeek } from "../util/week.js";

export interface AppState {
  tokens: Tokens | null;
  calendars: GCalCalendar[];
  events: GCalEvent[];
  weekStart: Date;
  weekLength: WeekLength;
  weekStartDay: WeekStartDay;
  loading: boolean;
  error: string | null;
}

export const [appState, setAppState] = createState<AppState>({
  tokens: null,
  calendars: [],
  events: [],
  weekStart: startOfWeek(new Date(), DEFAULT_SETTINGS.weekStartDay),
  weekLength: DEFAULT_SETTINGS.weekLength,
  weekStartDay: DEFAULT_SETTINGS.weekStartDay,
  loading: false,
  error: null,
});

export function patch(update: Partial<AppState>) {
  setAppState((s) => ({ ...s, ...update }));
}

export function applySettings(settings: Settings) {
  const current = appState.get();
  patch({
    weekLength: settings.weekLength,
    weekStartDay: settings.weekStartDay,
    weekStart: startOfWeek(current.weekStart, settings.weekStartDay),
  });
}
