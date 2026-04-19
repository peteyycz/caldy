import GLib from "gi://GLib";
import Soup from "gi://Soup?version=3.0";

const session = new Soup.Session();
const decoder = new TextDecoder("utf-8");

export type HttpHeaders = Record<string, string>;

export interface HttpResponse {
  status: number;
  body: string;
}

function sendMessage(message: Soup.Message): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (_, result) => {
      try {
        const bytes = session.send_and_read_finish(result);
        const data = bytes?.get_data();
        const body = data ? decoder.decode(data) : "";
        resolve({ status: message.get_status(), body });
      } catch (err) {
        reject(err);
      }
    });
  });
}

function applyHeaders(message: Soup.Message, headers?: HttpHeaders) {
  if (!headers) return;
  for (const [name, value] of Object.entries(headers)) {
    message.request_headers.append(name, value);
  }
}

export async function httpGet(url: string, headers?: HttpHeaders): Promise<HttpResponse> {
  const message = Soup.Message.new("GET", url);
  applyHeaders(message, headers);
  return sendMessage(message);
}

export async function httpPostForm(
  url: string,
  form: Record<string, string>,
  headers?: HttpHeaders,
): Promise<HttpResponse> {
  const encoded = Soup.form_encode_hash(form);
  const message = Soup.Message.new_from_encoded_form("POST", url, encoded);
  applyHeaders(message, headers);
  return sendMessage(message);
}

export function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

export function encodeQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

export function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!query) return out;
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = eq < 0 ? pair : pair.slice(0, eq);
    const value = eq < 0 ? "" : pair.slice(eq + 1).replace(/\+/g, " ");
    out[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return out;
}
