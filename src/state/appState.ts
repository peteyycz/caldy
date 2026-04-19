import { createState } from "ags";

import { GCalCalendar, GCalEvent } from "../services/CalendarClient.js";
import { Tokens } from "../services/TokenStore.js";
import { startOfWeek } from "../util/week.js";

export interface AppState {
  tokens: Tokens | null;
  calendars: GCalCalendar[];
  events: GCalEvent[];
  weekStart: Date;
  loading: boolean;
  error: string | null;
}

export const [appState, setAppState] = createState<AppState>({
  tokens: null,
  calendars: [],
  events: [],
  weekStart: startOfWeek(new Date()),
  loading: false,
  error: null,
});

export function patch(update: Partial<AppState>) {
  setAppState((s) => ({ ...s, ...update }));
}
