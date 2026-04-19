import { encodeQuery, httpGet, parseJson } from "../util/http.js";
import * as OAuth from "./OAuth.js";
import { Tokens } from "./TokenStore.js";

const API_ROOT = "https://www.googleapis.com/calendar/v3";

export interface GCalCalendar {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
  accessRole?: string;
}

export interface GCalEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GCalEvent {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  start: GCalEventDateTime;
  end: GCalEventDateTime;
  calendarId: string;
}

function parseEventDate(dt: GCalEventDateTime): Date {
  if (dt.dateTime) return new Date(dt.dateTime);
  if (dt.date) return new Date(`${dt.date}T00:00:00`);
  return new Date(NaN);
}

export function isAllDay(event: GCalEvent): boolean {
  return !!event.start.date && !event.start.dateTime;
}

export function eventStart(event: GCalEvent): Date {
  return parseEventDate(event.start);
}

export function eventEnd(event: GCalEvent): Date {
  return parseEventDate(event.end);
}

export class CalendarClient {
  private tokens: Tokens;

  constructor(initial: Tokens) {
    this.tokens = initial;
  }

  getTokens(): Tokens {
    return this.tokens;
  }

  private async authorizedGet<T>(url: string): Promise<T> {
    if (Date.now() >= this.tokens.expires_at - 30_000) {
      this.tokens = await OAuth.refresh(this.tokens);
    }
    let resp = await httpGet(url, { Authorization: `Bearer ${this.tokens.access_token}` });
    if (resp.status === 401) {
      this.tokens = await OAuth.refresh(this.tokens);
      resp = await httpGet(url, { Authorization: `Bearer ${this.tokens.access_token}` });
    }
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`Calendar API ${resp.status}: ${resp.body}`);
    }
    return parseJson<T>(resp.body);
  }

  async listCalendars(): Promise<GCalCalendar[]> {
    const data = await this.authorizedGet<{ items: GCalCalendar[] }>(
      `${API_ROOT}/users/me/calendarList`,
    );
    return (data.items ?? []).filter((c) => !c.hidden);
  }

  async listEvents(
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<GCalEvent[]> {
    const query = encodeQuery({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    const url = `${API_ROOT}/calendars/${encodeURIComponent(calendarId)}/events?${query}`;
    const data = await this.authorizedGet<{ items: Omit<GCalEvent, "calendarId">[] }>(url);
    return (data.items ?? []).map((e) => ({ ...e, calendarId }));
  }

  async fetchWeek(
    calendars: GCalCalendar[],
    weekStart: Date,
  ): Promise<GCalEvent[]> {
    const timeMin = new Date(weekStart);
    const timeMax = new Date(weekStart);
    timeMax.setDate(timeMax.getDate() + 7);

    const results = await Promise.all(
      calendars.map((cal) =>
        this.listEvents(cal.id, timeMin, timeMax).catch((err) => {
          console.error(`Failed to fetch ${cal.id}:`, err);
          return [] as GCalEvent[];
        }),
      ),
    );
    return results.flat().sort(
      (a, b) => eventStart(a).getTime() - eventStart(b).getTime(),
    );
  }
}
