import { request } from "node:http";
import { SESSION_HEADER } from "@better-grill/protocol";

export class BridgeError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Where a call goes. `session` is sent on every call; Claude-side routes require it. */
export type Bridge = { port: number; session?: string };

/** A session handle, as printed by `grill start`: "<port>-<id>". */
export function formatHandle(port: number, session: string) {
  return `${port}-${session}`;
}

export function parseHandle(handle: string): Bridge | null {
  const match = /^(\d+)-([a-z0-9]+)$/.exec(handle);
  return match ? { port: Number(match[1]), session: match[2] } : null;
}

/**
 * Call the bridge. Uses node:http rather than fetch on purpose: fetch (undici)
 * gives up on a response after 300s, and a wait may stay open for hours.
 */
export function call<T = unknown>({ port, session }: Bridge, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: {
          ...(session ? { [SESSION_HEADER]: session } : {}),
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data: unknown = text;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            // plain-text body
          }
          const status = res.statusCode ?? 500;
          if (status >= 400) {
            const message = (data as { error?: string } | null)?.error ?? text;
            reject(new BridgeError(status, message));
          } else {
            resolve(data as T);
          }
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
