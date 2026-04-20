import GLib from "gi://GLib";
import Secret from "gi://Secret?version=1";

export interface Tokens {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
}

const SCHEMA = Secret.Schema.new(
  "dev.caldy.Tokens",
  Secret.SchemaFlags.NONE,
  { kind: Secret.SchemaAttributeType.STRING },
);
const ATTRS = { kind: "accounts" };
const LABEL = "caldy accounts";

export function newAccountId(): string {
  return GLib.uuid_string_random();
}

export function loadAccounts(): Promise<Tokens[]> {
  return new Promise((resolve, reject) => {
    Secret.password_lookup(SCHEMA, ATTRS, null, (_src, result) => {
      try {
        const raw = Secret.password_lookup_finish(result);
        if (!raw) return resolve([]);
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return resolve([]);
        resolve(
          parsed.filter((t: any): t is Tokens =>
            !!t && typeof t === "object"
            && typeof t.access_token === "string"
            && typeof t.refresh_token === "string"
            && typeof t.id === "string",
          ),
        );
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function saveAccounts(tokens: Tokens[]): Promise<void> {
  return new Promise((resolve, reject) => {
    Secret.password_store(
      SCHEMA,
      ATTRS,
      Secret.COLLECTION_DEFAULT,
      LABEL,
      JSON.stringify(tokens),
      null,
      (_src, result) => {
        try {
          Secret.password_store_finish(result);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

export function clearAccounts(): Promise<void> {
  return new Promise((resolve, reject) => {
    Secret.password_clear(SCHEMA, ATTRS, null, (_src, result) => {
      try {
        Secret.password_clear_finish(result);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}
