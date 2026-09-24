/*
 * Fake Claude for UI work: posts rounds to a running bridge, echoes chat replies,
 * and walks to a summary. Start the bridge first (`pnpm dev`), then `pnpm demo`.
 * Against another bridge: `pnpm demo <session handle from grill start>`.
 */
import type { WaitResponse } from "@better-grill/protocol";
import { call, parseHandle } from "../src/client.ts";
import { rounds } from "./demo-rounds.ts";

const handle = process.argv[2] ?? "4777-dev";
const bridge = parseHandle(handle) ?? (console.error(`Not a session handle: ${handle}`), process.exit(2));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let posted = 0;

async function postNextRound() {
  const round = rounds[posted++];
  if (!round) {
    await call(bridge, "POST", "/api/summary", {
      markdown: [
        "### Settled",
        "- **First user:** solo developers",
        "- **State:** JSON file per session",
        "- **Tab close:** restore on reopen",
        "",
        "### Still risky",
        "- Windows support untested",
      ].join("\n"),
    });
    console.log("posted summary");
    return;
  }
  const result = await call(bridge, "POST", "/api/rounds", round);
  console.log("posted round", result);
}

await sleep(800);
await postNextRound();

for (;;) {
  const { events, open, shutdown } = await call<WaitResponse>(bridge, "GET", "/api/wait");
  if (shutdown) break;
  console.log(JSON.stringify(events));
  await sleep(900); // pretend to think
  for (const event of events) {
    if (event.type === "chat") {
      // "ok ..." settles the question, like a real discussion would.
      const settles = /^ok\b/i.test(event.text);
      await call(bridge, "POST", `/api/questions/${event.questionId}/reply`, {
        text: settles
          ? `(demo) Resolved ${event.questionId} as you said.`
          : `(demo) You said: _${event.text || "(no text)"}_${event.images ? ` and sent ${event.images.length} image(s): ${event.images.join(", ")}` : ""}\n\nFair point. The trade-off on **${event.title}** is mostly about how fast you want to learn versus how much you want to support.\n\nStart a message with "ok" to settle it.`,
      });
      if (settles) await call(bridge, "POST", `/api/questions/${event.questionId}/resolve`, { text: event.text });
    }
    if (event.type === "summary_confirmed" || event.type === "ended") {
      console.log("done");
      process.exit(0);
    }
    if (event.type === "summary_rejected") {
      await call(bridge, "POST", "/api/rounds", {
        title: "Follow-up",
        questions: [{ title: "What did the summary get wrong?", body: event.text ?? "" }],
      });
    }
  }
  if (events.some((e) => e.type === "answer") && open.length === 0) await postNextRound();
}
