import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Soup from "gi://Soup?version=3.0";

import { encodeQuery, httpPostForm, parseJson, parseQuery } from "../util/http.js";
import { getCredentials } from "./Config.js";
import { loadAccounts, newAccountId, Tokens } from "./TokenStore.js";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar";

interface PendingAuth {
  verifier: string;
  state: string;
  redirectUri: string;
  server: Soup.Server;
  resolve: (code: string) => void;
  reject: (err: Error) => void;
}

const CALLBACK_HTML =
  "<!doctype html><meta charset=utf-8><title>caldy</title>" +
  "<h2 style='font-family:sans-serif;padding:2rem'>Signed in. You may close this tab.</h2>";

function randomUrlSafe(bytes: number): string {
  const raw = GLib.random_int().toString(16) + GLib.random_int().toString(16);
  // Build ~2*bytes hex chars then trim; good enough for PKCE verifier entropy bounds.
  let out = raw;
  while (out.length < bytes * 2) out += GLib.random_int().toString(16);
  return out.slice(0, Math.max(43, bytes * 2));
}

function base64Url(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  const b64 = (globalThis as any).btoa
    ? (globalThis as any).btoa(bin)
    : GLib.base64_encode(bytes);
  return (b64 as string).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sha256(input: string): Uint8Array {
  const checksum = new GLib.Checksum(GLib.ChecksumType.SHA256);
  const bytes = new TextEncoder().encode(input);
  checksum.update(bytes);
  const hex = checksum.get_string();
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomUrlSafe(32);
  const challenge = base64Url(sha256(verifier));
  return { verifier, challenge };
}

function openBrowser(url: string) {
  Gio.AppInfo.launch_default_for_uri(url, null);
}

let activeServer: Soup.Server | null = null;

function startLoopbackServer(
  pending: Omit<PendingAuth, "server" | "redirectUri">,
): { server: Soup.Server; redirectUri: string } {
  const server = new Soup.Server({});
  activeServer = server;
  let consumed = false;

  server.add_handler("/callback", (_srv, msg) => {
    const uri = msg.get_uri();
    const query = uri?.get_query() ?? "";
    console.log(`caldy: callback hit, query="${query}"`);

    if (consumed) {
      msg.set_status(410, null);
      return;
    }

    const params = parseQuery(query);
    const code = params["code"];
    const state = params["state"];
    const error = params["error"];

    msg.set_status(200, null);
    msg.set_response("text/html", Soup.MemoryUse.COPY, CALLBACK_HTML);
    consumed = true;

    // Defer resolution until Soup has flushed the response to the browser;
    // otherwise teardown() closes the connection before the success page renders.
    const finishedId = msg.connect("finished", () => {
      msg.disconnect(finishedId);
      if (error) {
        pending.reject(new Error(`OAuth error: ${error}`));
        return;
      }
      if (state !== pending.state || !code) {
        pending.reject(new Error("OAuth state mismatch or missing code"));
        return;
      }
      pending.resolve(code);
    });
  });

  let ok = false;
  try {
    ok = server.listen_local(0, Soup.ServerListenOptions.IPV4_ONLY);
  } catch (err) {
    throw new Error(`Soup.Server.listen_local threw: ${(err as Error).message}`);
  }
  if (!ok) throw new Error("Soup.Server.listen_local returned false");

  const uris = server.get_uris();
  if (!uris || uris.length === 0) {
    throw new Error("Soup.Server bound but returned no URIs");
  }
  for (const u of uris) {
    console.log(`caldy: soup server listening at ${u.to_string()}`);
  }
  const port = uris[0].get_port();
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  console.log(`caldy: redirect_uri=${redirectUri}`);
  return { server, redirectUri };
}

function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  challenge: string,
  state: string,
): string {
  const query = encodeQuery({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  return `${AUTH_ENDPOINT}?${query}`;
}

async function exchangeCode(
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<Tokens> {
  const { clientId, clientSecret } = getCredentials();
  const resp = await httpPostForm(TOKEN_ENDPOINT, {
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  if (resp.status !== 200) {
    throw new Error(`Token exchange failed (${resp.status}): ${resp.body}`);
  }
  const payload = parseJson<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>(resp.body);
  return {
    id: newAccountId(),
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + payload.expires_in * 1000,
    scope: payload.scope,
    token_type: payload.token_type,
  };
}

export async function authorize(): Promise<Tokens> {
  const { clientId } = getCredentials();
  const { verifier, challenge } = pkcePair();
  const state = randomUrlSafe(16);

  return new Promise<Tokens>((resolve, reject) => {
    let server: Soup.Server | null = null;
    let redirectUri = "";

    const teardown = () => {
      server?.disconnect();
      activeServer = null;
    };

    const handle = {
      verifier,
      state,
      resolve: async (code: string) => {
        teardown();
        try {
          const tokens = await exchangeCode(code, verifier, redirectUri);
          resolve(tokens);
        } catch (err) {
          reject(err as Error);
        }
      },
      reject: (err: Error) => {
        teardown();
        reject(err);
      },
    };

    try {
      const started = startLoopbackServer(handle);
      server = started.server;
      redirectUri = started.redirectUri;
      openBrowser(buildAuthUrl(clientId, redirectUri, challenge, state));
    } catch (err) {
      reject(err as Error);
    }
  });
}

export async function refresh(current: Tokens): Promise<Tokens> {
  const { clientId, clientSecret } = getCredentials();
  const resp = await httpPostForm(TOKEN_ENDPOINT, {
    grant_type: "refresh_token",
    refresh_token: current.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (resp.status !== 200) {
    throw new Error(`Token refresh failed (${resp.status}): ${resp.body}`);
  }
  const payload = parseJson<{
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
    refresh_token?: string;
  }>(resp.body);
  const tokens: Tokens = {
    id: current.id,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? current.refresh_token,
    expires_at: Date.now() + payload.expires_in * 1000,
    scope: payload.scope ?? current.scope,
    token_type: payload.token_type ?? current.token_type,
  };
  return tokens;
}

export function loadPersistedAccounts(): Promise<Tokens[]> {
  return loadAccounts();
}
