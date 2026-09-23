/*
 * Fake Claude for UI work: posts rounds to a running bridge, echoes chat replies,
 * and walks to a summary. Start the bridge first (`pnpm dev`), then `pnpm demo`.
 * Against another bridge: `pnpm demo <session handle from grill start>`.
 */
import type { RoundInput, WaitResponse } from "@better-grill/protocol";
import { call, parseHandle } from "../src/client.ts";

const handle = process.argv[2] ?? "4777-dev";
const bridge = parseHandle(handle) ?? (console.error(`Not a session handle: ${handle}`), process.exit(2));

type RoundDraft = Omit<RoundInput, "questions"> & { questions: Partial<RoundInput["questions"][number]>[] };

const rounds: RoundDraft[] = [
  {
    title: "Shape of the thing",
    questions: [
      {
        title: "Who is the first user?",
        body: "Everything downstream (auth, onboarding, pricing) hangs off this. Pick the one person you'd demo to **next week**.",
        options: [
          { label: "Solo developers", description: "Install locally, no accounts, fast feedback." },
          { label: "Small teams", description: "Shared sessions, needs some notion of identity." },
          { label: "Enterprise", description: "SSO, audit, procurement. Slow loop." },
        ],
        recommended: 0,
        recommendation: "**Solo developers.** Cheapest loop to learn from, and nothing about teams is blocked by starting here.",
      },
      {
        title: "Where does state live?",
        body: "Session answers need to survive at least a browser refresh.",
        options: [
          { label: "Memory only", description: "Dies with the process." },
          { label: "JSON file per session", description: "Easy to inspect and diff." },
          { label: "SQLite", description: "Queryable history, one more dependency." },
        ],
        recommended: 1,
        recommendation: "JSON file per session: inspectable, and grill-with-docs can read it later.",
      },
      {
        title: "Which platforms at launch?",
        body: "Pick every platform you would block the release on.",
        options: [{ label: "macOS" }, { label: "Linux" }, { label: "Windows" }],
        multiSelect: true,
        recommended: 0,
      },
    ],
  },
  {
    title: "Consequences",
    questions: [
      {
        title: "What happens when the browser tab is closed mid-round?",
        body: "Claude keeps waiting. Should reopening the URL restore the session, or should closing the tab end it?",
        options: [
          { label: "Restore on reopen", description: "Tab is just a view; bridge is the truth." },
          { label: "Closing ends session", description: "Simpler mental model, easy to lose work." },
        ],
        recommended: 0,
      },
      {
        title: "Anything we have not covered?",
        body: "Open question. Type whatever is nagging you.",
      },
    ],
  },
];

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
          : `(demo) You said: _${event.text}_\n\nFair point. The trade-off on **${event.title}** is mostly about how fast you want to learn versus how much you want to support.\n\nStart a message with "ok" to settle it.`,
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
