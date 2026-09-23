/* Sample rounds shared by `pnpm demo` and `pnpm screenshots`. */
import type { RoundInput } from "@better-grill/protocol";

export type RoundDraft = Omit<RoundInput, "questions"> & { questions: Partial<RoundInput["questions"][number]>[] };

export const rounds: RoundDraft[] = [
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
