import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  AddQuestionsSchema,
  AnswerRequestSchema,
  QuestionPatchSchema,
  type Health,
  ResolveInputSchema,
  RoundInputSchema,
  SESSION_HEADER,
  SummaryInputSchema,
  SummaryResponseSchema,
  TextSchema,
  type WaitResponse,
} from "@better-grill/protocol";
import { webDist } from "./paths.ts";
import { createSession, HttpError } from "./session.ts";

/*
 * The bridge. Claude reaches it with the CLI (curl-like calls from its Bash tool),
 * the browser reaches it over HTTP + SSE. It never calls Claude: Claude pulls
 * events with a long-poll on /api/wait, run as a background Bash task.
 * Claude-side routes only answer calls that carry this bridge's session id.
 */

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "4777" },
    title: { type: "string", default: "Grill session" },
    mode: { type: "string", default: "plain" },
    session: { type: "string", default: "dev" },
  },
});

const port = Number(values.port);
const sessionId = values.session;
/** Answers clicked in quick succession reach Claude as one batch. */
const BATCH_MS = 600;
/** Exit after this long with no Claude wait, no open browser tab and no requests, so dead sessions don't leave bridges behind. */
const IDLE_MS = 30 * 60_000;

if (values.mode !== "plain" && values.mode !== "docs") {
  console.error(`--mode must be plain or docs, got ${values.mode}`);
  process.exit(2);
}
const session = createSession(values.title, values.mode);
const streams = new Set<ServerResponse>();
let waiter: ServerResponse | null = null;
let flushTimer: NodeJS.Timeout | undefined;
let lastActivity = Date.now();

session.onChange(() => {
  const frame = `data: ${JSON.stringify(session.state)}\n\n`;
  for (const stream of streams) stream.write(frame);
  if (waiter && session.hasEvents()) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, BATCH_MS);
  }
});

function flush() {
  if (!waiter || !session.hasEvents()) return;
  const res = waiter;
  waiter = null;
  const events = session.takeEvents();
  log(`deliver ${events.map((e) => e.type).join(", ")}`);
  json(res, 200, { events, open: session.openQuestions() } satisfies WaitResponse);
  session.setClaude("working");
}

// ---------- Handlers ----------

type Handler = (req: IncomingMessage, res: ServerResponse, params: string[]) => unknown;

/**
 * Wraps a Claude-side handler: refuse calls meant for another bridge. The error
 * never names this bridge's id, so a confused caller can't copy it from there.
 */
function guarded(handler: Handler): Handler {
  return (req, res, params) => {
    const given = req.headers[SESSION_HEADER];
    if (given !== sessionId) {
      const title = session.state.title;
      throw new HttpError(
        409,
        given
          ? `Wrong session: port ${port} belongs to another grill ("${title}"), not ${port}-${given}. Use the handle your own \`grill start\` printed.`
          : `Missing session id. Pass the handle your own \`grill start\` printed.`,
      );
    }
    return handler(req, res, params);
  };
}

function wait(_req: IncomingMessage, res: ServerResponse) {
  if (waiter) json(waiter, 200, { events: [], open: session.openQuestions(), superseded: true } satisfies WaitResponse);
  waiter = res;
  res.on("close", () => {
    if (waiter !== res) return;
    waiter = null;
    session.setClaude("working");
  });
  session.setClaude("listening");
  // Events that piled up while Claude was busy go out right away.
  if (session.hasEvents()) flush();
}

function stream(_req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify(session.state)}\n\n`);
  streams.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
  res.on("close", () => {
    clearInterval(ping);
    streams.delete(res);
  });
}

function shutdown(_req: IncomingMessage, res: ServerResponse) {
  json(res, 200, { ok: true });
  session.close();
  if (waiter) {
    json(waiter, 200, { events: [], open: [], shutdown: true } satisfies WaitResponse);
    waiter = null;
  }
  log("shutdown");
  setTimeout(() => process.exit(0), 200);
}

const ok = { ok: true };

const routes: [method: string, pattern: RegExp, handler: Handler][] = [
  [
    "GET",
    /^\/api\/health$/,
    (_req, res) => json(res, 200, { ok: true, title: session.state.title, pid: process.pid, session: sessionId } satisfies Health),
  ],
  ["GET", /^\/api\/stream$/, stream],

  // Claude side
  ["GET", /^\/api\/state$/, guarded((_req, res) => json(res, 200, session.state))],
  ["GET", /^\/api\/wait$/, guarded(wait)],
  [
    "POST",
    /^\/api\/rounds$/,
    guarded(async (req, res) => json(res, 201, session.addRound(await body(req, RoundInputSchema)))),
  ],
  [
    "POST",
    /^\/api\/rounds\/current\/questions$/,
    guarded(async (req, res) => json(res, 201, session.addQuestions((await body(req, AddQuestionsSchema)).questions))),
  ],
  [
    "POST",
    /^\/api\/questions\/(Q\d+)\/edit$/,
    guarded(async (req, res, [id]) => {
      session.edit(id!, await body(req, QuestionPatchSchema));
      json(res, 200, ok);
    }),
  ],
  [
    "POST",
    /^\/api\/questions\/(Q\d+)\/resolve$/,
    guarded(async (req, res, [id]) => {
      session.resolve(id!, await body(req, ResolveInputSchema));
      json(res, 200, ok);
    }),
  ],
  [
    "POST",
    /^\/api\/questions\/(Q\d+)\/reply$/,
    guarded(async (req, res, [id]) => {
      session.reply(id!, (await body(req, TextSchema)).text);
      json(res, 200, ok);
    }),
  ],
  [
    "POST",
    /^\/api\/questions\/(Q\d+)\/drop$/,
    guarded(async (req, res, [id]) => {
      session.drop(id!, (await body(req, TextSchema)).text);
      json(res, 200, ok);
    }),
  ],
  [
    "POST",
    /^\/api\/summary$/,
    guarded(async (req, res) => {
      session.setSummary((await body(req, SummaryInputSchema)).markdown);
      json(res, 200, ok);
    }),
  ],
  ["POST", /^\/api\/shutdown$/, guarded(shutdown)],

  // Browser side
  [
    "POST",
    /^\/api\/questions\/(Q\d+)\/answer$/,
    async (req, res, [id]) => {
      session.answer(id!, await body(req, AnswerRequestSchema));
      json(res, 200, ok);
    },
  ],
  [
    "POST",
    /^\/api\/send$/,
    (_req, res) => {
      session.send();
      json(res, 200, ok);
    },
  ],
  [
    "POST",
    /^\/api\/questions\/(Q\d+)\/chat$/,
    async (req, res, [id]) => {
      session.chat(id!, (await body(req, TextSchema)).text);
      json(res, 200, ok);
    },
  ],
  [
    "POST",
    /^\/api\/summary\/respond$/,
    async (req, res) => {
      const { confirmed, text } = await body(req, SummaryResponseSchema);
      session.respondSummary(confirmed, text);
      json(res, 200, ok);
    },
  ],
  [
    "POST",
    /^\/api\/end$/,
    (_req, res) => {
      session.end();
      json(res, 200, ok);
    },
  ],
];

// ---------- Plumbing ----------

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

async function body<S extends z.ZodType>(req: IncomingMessage, schema: S): Promise<z.output<S>> {
  // A JSON content type forces a CORS preflight, which the bridge never answers.
  if (!req.headers["content-type"]?.startsWith("application/json")) throw new HttpError(415, "Body must be application/json");
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "Body is not valid JSON");
  }
  const result = schema.safeParse(data);
  if (!result.success) throw new HttpError(400, z.prettifyError(result.error));
  return result.data;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function serveStatic(pathname: string, res: ServerResponse) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  let file = join(webDist, relative);
  if (!file.startsWith(webDist)) throw new HttpError(404, "Not found");
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    file = join(webDist, "index.html");
  }
  let data: Buffer;
  try {
    data = await readFile(file);
  } catch {
    res.writeHead(503, { "content-type": "text/plain" });
    res.end("Web UI is missing. Reinstall better-grill, or run `pnpm build` in a source checkout.");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(data);
}

/** Refuse anything not addressed to localhost (DNS rebinding). */
function isLocalHost(host: string | undefined) {
  return !!host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}

/**
 * Browsers send Origin on cross-origin requests. Only the page this bridge serves
 * may talk to it; otherwise any open website could post chat into the Claude
 * session. The CLI sends no Origin.
 */
function isOwnOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  return origin === undefined || origin === `http://${req.headers.host}`;
}

function log(message: string) {
  console.error(`[bridge ${new Date().toISOString()}] ${message}`);
}

const server = createServer(async (req, res) => {
  try {
    lastActivity = Date.now();
    if (!isLocalHost(req.headers.host)) throw new HttpError(403, "Forbidden host");
    if (!isOwnOrigin(req)) throw new HttpError(403, "Forbidden origin");
    const url = new URL(req.url ?? "/", "http://localhost");
    for (const [method, pattern, handler] of routes) {
      const match = pattern.exec(url.pathname);
      if (match && req.method === method) {
        await handler(req, res, match.slice(1));
        return;
      }
    }
    if (url.pathname.startsWith("/api/")) throw new HttpError(404, `No route ${req.method} ${url.pathname}`);
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    await serveStatic(url.pathname, res);
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error(error);
    json(res, status, { error: error instanceof Error ? error.message : String(error) });
  }
});

// A wait can stay open for hours.
server.requestTimeout = 0;

server.listen(port, "127.0.0.1", () => log(`listening on http://localhost:${port}/ — ${session.state.title}`));

setInterval(() => {
  if (waiter || streams.size > 0 || Date.now() - lastActivity < IDLE_MS) return;
  log("idle, exiting");
  process.exit(0);
}, 60_000).unref();

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => process.exit(0));
