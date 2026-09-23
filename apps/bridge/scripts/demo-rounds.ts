/* Sample rounds shared by `pnpm demo` and `pnpm screenshots`. Written the way Claude writes them: long context, markdown, tables. */
import type { RoundInput } from "@better-grill/protocol";

export type RoundDraft = Omit<RoundInput, "questions"> & { questions: Partial<RoundInput["questions"][number]>[] };

export const rounds: RoundDraft[] = [
  {
    title: "Shape of the thing",
    questions: [
      {
        title: "Who is the first user?",
        body: [
          "Everything downstream hangs off this one: **auth**, **onboarding**, **pricing**, even what \"a session\" means. Pick the one person you'd demo to **next week**, not the market you want in a year.",
          "",
          "What I found in the repo so far:",
          "",
          "- There is no user model at all. `session.ts` keys everything by a random handle, so today every session is anonymous.",
          "- The CLI assumes a local terminal (`grill start` opens a browser on `localhost`), which already leans towards one person on one machine.",
          "- The README pitch talks about *\"your own grill sessions\"*, singular.",
          "",
          "> Starting narrow isn't a bet against teams. It just means the first 20 users can tell you what \"shared\" should even mean before you build it.",
          "",
          "If you pick teams or enterprise, expect the next round to be mostly about identity and permissions rather than the grill itself.",
        ].join("\n"),
        options: [
          { label: "Solo developers", description: "Install locally, no accounts, fast feedback." },
          { label: "Small teams", description: "Shared sessions, needs some notion of identity." },
          { label: "Enterprise", description: "SSO, audit, procurement. Slow loop." },
        ],
        recommended: 0,
        recommendation:
          "**Solo developers.** Cheapest loop to learn from, it matches how the CLI already works, and nothing about teams is blocked by starting here.",
      },
      {
        title: "Where does state live?",
        body: [
          "Session answers need to survive **at least a browser refresh**, and ideally a bridge restart. Right now everything is held in memory in `SessionStore`, so a crash loses the whole grill.",
          "",
          "Here's how the three options compare on what matters for a local tool:",
          "",
          "| | Survives restart | Inspectable | New dependency | Query history |",
          "|---|---|---|---|---|",
          "| Memory only | no | no | none | no |",
          "| JSON file per session | yes | `cat` it | none | grep |",
          "| SQLite | yes | needs a client | `better-sqlite3` (native) | SQL |",
          "",
          "A JSON file would look roughly like this:",
          "",
          "```json",
          '{ "session": "4777-a1b2c3", "rounds": [ ... ], "questions": { "Q1": { "answer": { "optionIds": ["o1"] } } } }',
          "```",
          "",
          "One thing to watch: `better-sqlite3` ships a native binary, which is exactly the kind of install friction that hurts a tool people try once from `npx`.",
        ].join("\n"),
        options: [
          { label: "Memory only", description: "Dies with the process." },
          { label: "JSON file per session", description: "Easy to inspect and diff." },
          { label: "SQLite", description: "Queryable history, one more dependency." },
        ],
        recommended: 1,
        recommendation:
          "**JSON file per session.** Inspectable, zero dependencies, and `grill-with-docs` can read it later. Moving to SQLite once you want search across sessions is a small migration.",
      },
      {
        title: "Which platforms at launch?",
        body: [
          "Pick every platform you would **block the release on**. Anything you leave out still *probably* works, it just isn't tested before a release.",
          "",
          "Known rough edges per platform:",
          "",
          "1. **macOS**: none known, it's where everything was built.",
          "2. **Linux**: `xdg-open` may be missing on minimal distros, so the browser won't open by itself (the URL is still printed).",
          "3. **Windows**: paths in `paths.ts` use `fileURLToPath`, which is fine, but `grill stop` relies on signals that behave differently there.",
        ].join("\n"),
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
        body: [
          "Claude keeps waiting on `/api/wait` no matter what the browser does, so the real question is what the **tab** means.",
          "",
          "### If the tab is just a view",
          "",
          "Reopening the URL picks up exactly where you left off: same round, same half-written answers, same discussion threads. The bridge is the source of truth and the tab can come and go.",
          "",
          "### If the tab is the session",
          "",
          "Closing it tells Claude you're done, and it wraps up with whatever was answered. Simpler to explain, but one stray `⌘W` ends a 20-minute grill.",
          "",
          "Worth knowing: the bridge already keeps every locked-in answer, so *restore on reopen* is mostly free. The only new piece is keeping unsent drafts, which today live in React state.",
        ].join("\n"),
        options: [
          { label: "Restore on reopen", description: "Tab is just a view; bridge is the truth." },
          { label: "Closing ends session", description: "Simpler mental model, easy to lose work." },
        ],
        recommended: 0,
        recommendation: "**Restore on reopen.** Losing a long grill to a stray shortcut is the worst failure this tool can have, and the bridge already holds the answers.",
      },
      {
        title: "How should Claude handle a question you skip?",
        body: [
          "Sometimes a question just doesn't apply, or you'd rather not decide yet. Right now **Send** needs every question answered, so the only way out is typing something like *\"skip\"*.",
          "",
          "Options I can see:",
          "",
          "- A **Skip** button that sends the question back marked as skipped, and Claude decides whether to ask again later.",
          "- Let **Send** go through with open questions and treat them as *\"no opinion, use your judgement\"*.",
          "- Keep it strict and make every question explicit.",
          "",
          "The strict version keeps summaries honest, but it pushes people to write filler answers, which is worse than an honest skip.",
        ].join("\n"),
        options: [
          { label: "Skip button", description: "Explicit, Claude sees it was skipped." },
          { label: "Send with open questions", description: "Fast, but silence is ambiguous." },
          { label: "Keep it strict", description: "Every question needs an answer." },
        ],
        recommended: 0,
        recommendation: "**Skip button.** Keeps the signal explicit without forcing filler answers.",
      },
      {
        title: "Anything we have not covered?",
        body: "Open question. Type whatever is nagging you: a risk, a feature you're unsure about, or something from earlier rounds you want to revisit.",
      },
    ],
  },
];
