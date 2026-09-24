#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, openSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { Health, RoundPosted, SessionState, WaitResponse } from "@better-grill/protocol";
import { type Bridge, BridgeError, call, formatHandle, parseHandle } from "./client.ts";
import { serverEntry, visualizeGuide, webDist } from "./paths.ts";

const USAGE = `grill — drive a better-grill UI session from Claude Code

  grill start [--title T] [--docs] [--port N] [--no-open]
                                                   start bridge, open browser, print {"session","url","log"}
                                                   --docs: session also records CONTEXT.md and ADRs
  grill round  -s SESSION   < round.json           post a round of questions
  grill add    -s SESSION   < questions.json       add questions to the latest round, while unsent
  grill wait   -s SESSION                          block until the user acts, print events (run in background)
  grill reply  -s SESSION Q3 < text.md             reply in the chat of a question
  grill resolve -s SESSION Q3 < resolution.json    answer a question for the user: {"options":[1],"text":"…"}
  grill edit   -s SESSION Q3 < patch.json          rewrite a question (partial fields)
  grill drop   -s SESSION Q3 < reason.txt          remove a question that no longer matters
  grill visualize -s SESSION Q3 --brief            print how to build Q3's visualization, and the question it's for
  grill visualize -s SESSION Q3 < page.html        post Q3's visualization (an HTML fragment)
  grill visualize -s SESSION Q3 --fail < reason.txt  say why there is nothing useful to visualize
  grill summary -s SESSION  < summary.md           show final summary for confirmation
  grill state  -s SESSION                          print full session state (debugging)
  grill stop   -s SESSION                          shut the bridge down

SESSION is the handle \`grill start\` printed, like 62950-a1b2c3. Several bridges can
run at once; a handle that doesn't match the bridge on its port is refused.

Exit codes: 0 ok, 1 bridge rejected the input, 2 usage error or bridge unreachable.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    session: { type: "string", short: "s" },
    port: { type: "string" },
    title: { type: "string" },
    docs: { type: "boolean", default: false },
    brief: { type: "boolean", default: false },
    fail: { type: "boolean", default: false },
    "no-open": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const [command, arg] = positionals;

function fail(message: string, code = 2): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function bridge(): Bridge {
  if (!values.session) fail("Missing -s SESSION (printed by `grill start`).");
  return parseHandle(values.session) ?? fail(`\`${values.session}\` is not a session handle like 62950-a1b2c3.`);
}

function stdin(): string {
  if (process.stdin.isTTY) fail(`\`grill ${command}\` reads its input from stdin.`);
  const text = readFileSync(0, "utf8").trim();
  if (!text) fail(`\`grill ${command}\` got empty stdin.`);
  return text;
}

function stdinJson(): unknown {
  const raw = stdin();
  try {
    return JSON.parse(raw);
  } catch {
    fail("stdin is not valid JSON.", 1);
  }
}

function printPosted(verb: string, posted: RoundPosted) {
  console.log(`${verb} round ${posted.round}:`);
  for (const q of posted.questions) console.log(`  ${q.id}  ${q.title}`);
}

function questionId(): string {
  if (!arg || !/^Q\d+$/.test(arg)) fail(`\`grill ${command}\` needs a question id like Q3.`);
  return arg;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("No port"))));
    });
  });
}

function openBrowser(url: string) {
  const [opener, ...args] =
    process.platform === "darwin" ? ["open"] : process.platform === "win32" ? ["cmd", "/c", "start", ""] : ["xdg-open"];
  spawn(opener!, [...args, url], { detached: true, stdio: "ignore" }).unref();
}

/** The guide plus the question, its discussion and the user's note: all an agent building the visualization needs. */
async function brief() {
  const target = bridge();
  const id = questionId();
  const state = await call<SessionState>(target, "GET", "/api/state");
  const question = state.questions[id] ?? fail(`Unknown question ${id}.`, 1);
  const recommended = question.options.findIndex((o) => o.id === question.recommended);
  const self = `node "${process.argv[1]}" visualize -s ${values.session} ${id}`;
  const input = {
    title: question.title,
    body: question.body,
    options: question.options.map(({ label, description }) => ({ label, description })),
    recommended: recommended === -1 ? undefined : recommended,
    recommendation: question.recommendation,
    multiSelect: question.multiSelect,
    answer: question.answer && {
      choices: question.options.filter((o) => question.answer!.optionIds.includes(o.id)).map((o) => o.label),
      text: question.answer.text,
    },
  };
  const discussion = question.chat.map((m) => `**${m.role}:** ${m.text}`).join("\n\n");
  console.log(
    [
      readFileSync(visualizeGuide, "utf8").trim(),
      "---",
      `# This question: ${id}`,
      "```json\n" + JSON.stringify(input, null, 2) + "\n```",
      `## The user's note\n\n${question.visualization?.note ?? "None. Show what helps most."}`,
      discussion && `## Discussion so far\n\n${discussion}`,
      `## Commands\n\nPost the page (the heredoc delimiter must not appear in the page):\n\n\`\`\`bash\n${self} <<'GRILL_PAGE'\n…your HTML fragment…\nGRILL_PAGE\n\`\`\`\n\nOr, with nothing useful to visualize:\n\n\`\`\`bash\n${self} --fail <<'EOF'\nWhy, in one sentence.\nEOF\n\`\`\``,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

async function visualize() {
  if (values.brief) return brief();
  const id = questionId();
  if (values.fail) {
    await call(bridge(), "POST", `/api/questions/${id}/visualization/fail`, { text: stdin() });
    console.log(`Told the user why ${id} has no visualization.`);
    return;
  }
  await call(bridge(), "POST", `/api/questions/${id}/visualization`, { html: stdin() });
  console.log(`Posted the visualization of ${id}.`);
}

async function start() {
  const chosen = values.port ? Number(values.port) : await freePort();
  const session = randomBytes(3).toString("hex");
  const logFile = join(tmpdir(), `better-grill-${chosen}.log`);
  if (!existsSync(join(webDist, "index.html"))) {
    process.stderr.write("warning: web UI is missing, reinstall better-grill (or run `pnpm build` in a source checkout)\n");
  }
  const logFd = openSync(logFile, "a");
  const serverArgs = [
    ...["--port", String(chosen), "--session", session],
    ...["--title", values.title ?? "Grill session", "--mode", values.docs ? "docs" : "plain"],
  ];
  const child = spawn(process.execPath, [...process.execArgv, serverEntry, ...serverArgs], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();

  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      // Must be our child answering, not an older bridge still shutting down on this port.
      const health = await call<Health>({ port: chosen }, "GET", "/api/health");
      if (health.pid !== child.pid || health.session !== session) throw new Error("another bridge answered");
      const url = `http://localhost:${chosen}/`;
      if (!values["no-open"]) openBrowser(url);
      console.log(JSON.stringify({ session: formatHandle(chosen, session), url, log: logFile }));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  fail(`Bridge did not come up on port ${chosen}. See ${logFile}`);
}

async function main() {
  if (values.help || !command) {
    console.log(USAGE);
    return;
  }
  switch (command) {
    case "start":
      return start();
    case "round":
      printPosted("Posted", await call<RoundPosted>(bridge(), "POST", "/api/rounds", stdinJson()));
      return;
    case "add":
      printPosted("Added to", await call<RoundPosted>(bridge(), "POST", "/api/rounds/current/questions", stdinJson()));
      return;
    case "resolve":
      await call(bridge(), "POST", `/api/questions/${questionId()}/resolve`, stdinJson());
      console.log(`Resolved ${arg}. The user can still change it before sending.`);
      return;
    case "edit":
      await call(bridge(), "POST", `/api/questions/${questionId()}/edit`, stdinJson());
      console.log(`Edited ${arg}.`);
      return;
    case "wait": {
      const response = await call<WaitResponse>(bridge(), "GET", "/api/wait");
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    case "reply":
      await call(bridge(), "POST", `/api/questions/${questionId()}/reply`, { text: stdin() });
      console.log(`Replied in ${arg}.`);
      return;
    case "drop":
      await call(bridge(), "POST", `/api/questions/${questionId()}/drop`, { text: stdin() });
      console.log(`Dropped ${arg}.`);
      return;
    case "visualize":
      return visualize();
    case "summary":
      await call(bridge(), "POST", "/api/summary", { markdown: stdin() });
      console.log("Summary posted.");
      return;
    case "state":
      console.log(JSON.stringify(await call(bridge(), "GET", "/api/state"), null, 2));
      return;
    case "stop": {
      const target = bridge();
      await call(target, "POST", "/api/shutdown");
      // Return only once the port is free, so a following `grill start` can reuse it.
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          await call({ port: target.port }, "GET", "/api/health");
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch {
          console.log("Bridge stopped.");
          return;
        }
      }
      fail(`Bridge on port ${target.port} did not exit.`);
    }
    default:
      fail(`Unknown command \`${command}\`.\n\n${USAGE}`);
  }
}

main().catch((error: unknown) => {
  if (error instanceof BridgeError) fail(error.message, error.status >= 500 ? 2 : 1);
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ECONNREFUSED") fail(`No bridge for session ${values.session}. Start one with \`grill start\`.`);
  fail(error instanceof Error ? error.message : String(error));
});
