import { createState } from "ags";

import { GCalCalendar, GCalEvent } from "../services/CalendarClient.js";
import {
  DEFAULT_SETTINGS,
  Settings,
  WeekStartDay,
} from "../services/Settings.js";
import { Tokens } from "../services/TokenStore.js";
import { startOfWeek } from "../util/week.js";

export interface AppState {
  accounts: Tokens[];
  calendars: GCalCalendar[];
  events: GCalEvent[];
  hiddenCalendarIds: string[];
  weekStart: Date;
  showWeekend: boolean;
  weekStartDay: WeekStartDay;
  loading: boolean;
  error: string | null;
}

export const [appState, setAppState] = createState<AppState>({
  accounts: [],
  calendars: [],
  events: [],
  hiddenCalendarIds: [],
  weekStart: startOfWeek(new Date(), DEFAULT_SETTINGS.weekStartDay),
  showWeekend: DEFAULT_SETTINGS.showWeekend,
  weekStartDay: DEFAULT_SETTINGS.weekStartDay,
  loading: false,
  error: null,
});

export function patch(update: Partial<AppState>) {
  setAppState((s) => ({ ...s, ...update }));
}

export function toggleCalendarVisibility(calendarId: string) {
  setAppState((s) => {
    const hidden = s.hiddenCalendarIds.includes(calendarId)
      ? s.hiddenCalendarIds.filter((id) => id !== calendarId)
      : [...s.hiddenCalendarIds, calendarId];
    return { ...s, hiddenCalendarIds: hidden };
  });
}

export function applySettings(settings: Settings) {
  const current = appState.get();
  patch({
    showWeekend: settings.showWeekend,
    weekStartDay: settings.weekStartDay,
    weekStart: startOfWeek(current.weekStart, settings.weekStartDay),
  });
}
