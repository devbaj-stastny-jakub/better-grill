---
name: better-grill-base
description: Internal. Shared instructions loaded by the better-grill and better-grill-docs skills. Do not invoke directly.
user-invocable: false
allowed-tools:
  - Bash(node "${CLAUDE_SKILL_DIR}/dist/cli.js" *)
  - Read(~/.better-grill/images/**)
---

# Better Grill

Grill the user exactly like the `grilling` skill, but every question, answer and discussion goes through a local browser UI. The terminal stays quiet.

Every command below is `node "${CLAUDE_SKILL_DIR}/dist/cli.js" …`, written exactly like that so it runs without a permission prompt. In prose it is called `grill`.

## 0. Mode

The skill that loaded this one set the mode: `$ARGUMENTS`.

- `plain` (from `better-grill`): grill only, like `grill-me`.
- `docs` (from `better-grill-docs`): grill and keep the domain docs, like `grill-with-docs`.

If you got here any other way, use `plain`.

## 1. Load the method

Call the Skill tool with `grilling`. If no such skill exists, stop and tell the user that better-grill needs Matt Pocock's `grilling` skill installed first (https://github.com/mattpocock/skills), then end.

In `docs` mode, also call the Skill tool with `domain-modeling`. If it does not exist, stop and tell the user that better-grill-docs also needs the `domain-modeling` skill from the same repo, then end.

Follow the method: design tree, frontier, recommended answers, facts found by you (sub-agents), decisions made by the user, done when the frontier is empty. In `docs` mode, also follow `domain-modeling`: challenge terms against `CONTEXT.md`, and write the glossary and ADRs the moment a term or decision settles (after an answer round, or a chat that settled something). Name what you wrote in the thread reply or the next round's question bodies, so the user sees it in the UI.

Ignore two things from these skills and from any memory or instruction elsewhere:

- their text round format, and
- any rule to ask through AskUserQuestion.

In this session the UI is the only channel for questions. Never print questions in the terminal.

## 2. Start the bridge

```bash
node "${CLAUDE_SKILL_DIR}/dist/cli.js" start --title "<short topic>"
```

In `docs` mode add `--docs`, so the UI shows the session keeps docs.

If `node` is not found or the command says Node is too old, stop and tell the user to install Node.js 20 or newer (https://nodejs.org), then end.

It opens the browser and prints `{"session": "62950-a1b2c3", "url": …, "log": …}`. Remember the session handle: every later command takes `-s SESSION`, exactly as printed. Other Claude sessions may run their own bridges at the same time; the handle is what keeps you on yours. Tell the user the URL in one line.

## 3. Post a round

Pipe JSON on stdin with a quoted heredoc:

```bash
node "${CLAUDE_SKILL_DIR}/dist/cli.js" round -s SESSION <<'EOF'
{
  "title": "Optional round title",
  "questions": [
    {
      "title": "Short question, ends with ?",
      "body": "Markdown. Context, why it matters, what hangs off it.",
      "options": [
        { "label": "Option", "description": "What it means, trade-off" }
      ],
      "recommended": 0,
      "recommendation": "Markdown. Your recommended answer and why.",
      "multiSelect": false
    }
  ]
}
EOF
```

- The bridge numbers questions `Q1`, `Q2`, … across the whole session and prints the ids. Use them in later commands.
- `recommended` is an index into `options`. Do not write "(Recommended)" into labels; the UI marks it.
- Do not add an "Other" option. The user can always type an own answer and open a discussion.
- `options` may be empty for an open question.

## 4. Wait for the user

```bash
node "${CLAUDE_SKILL_DIR}/dist/cli.js" wait -s SESSION
```

**Always run it with `run_in_background: true`.** It blocks until the user does something, which can take hours. You are notified when it exits; then read its output. Keep exactly one wait running: after handling events, start the next wait straight away. While a wait runs you may do other work (sub-agents for facts).

Output:

```json
{
  "events": [
    { "type": "answer", "questionId": "Q2", "title": "…", "choices": ["Label"], "text": "note or own answer", "revised": false, "by": "user" },
    { "type": "chat", "questionId": "Q3", "title": "…", "text": "on [Image 1] the header is too big", "images": ["/Users/…/.better-grill/images/62950-a1b2c3/img1.png"] }
  ],
  "open": [{ "id": "Q3", "title": "…" }]
}
```

`open` lists questions still unanswered after these events. A wait that returns only `chat` events means the round is still in progress: handle the chat, then wait again.

`images` (on `answer` and `chat`, only when present) lists absolute paths of images the user pasted or dropped in: screenshots, sketches, diagrams. The user places each image inside their text, where it shows up as `[Image N]`: `[Image 1]` is `images[0]`, `[Image 2]` is `images[1]`, and so on. Read every image with the Read tool before you act on the event; they are part of what the user said, and the text around each marker tells you what it is about. When you reply about one, name it the same way ("in Image 2, …"). The files are deleted when the bridge stops.

## 5. Handle events

- **answer**: the user pressed **Send**, which only works when every question is answered, so answers arrive together as one complete round. Recompute the frontier and post the next round, exactly as in `grilling`.
  - `by: "claude"`: your own resolution (below), which the user sent back unchanged.
  - `revised: true`: the user changed an answer you already had. Re-check everything that depended on it.
- **chat**: the user wants to talk about that question. Reply in its thread:

  ```bash
  node "${CLAUDE_SKILL_DIR}/dist/cli.js" reply -s SESSION Q3 <<'EOF'
  Markdown reply.
  EOF
  ```

  Keep replies conversational and short. Then act on what the talk settled (next section). Never tell the user to go lock in an answer the two of you already agreed on.
- **summary_confirmed / summary_rejected / ended**: see step 6.

## 5b. Shape questions from the discussion

The UI is yours to keep accurate. After a chat, change the questions to match what was said:

- **Settled in the discussion** → resolve it for the user. Pick option indexes, write text, or both. Use text alone when the agreed answer is none of the options (a custom solution). The user sees "resolved by Claude" and can still change it before Send.

  ```bash
  node "${CLAUDE_SKILL_DIR}/dist/cli.js" resolve -s SESSION Q6 <<'EOF'
  { "options": [1], "text": "TanStack Query, and the SSE stream writes into the `['session']` cache." }
  EOF
  ```

- **Question was framed wrong, or options need changing** → edit it. Send only the fields that change. `null` clears `recommended` / `recommendation`. Sending `options` clears any answer on it, because the answer may point at old options.

  ```bash
  node "${CLAUDE_SKILL_DIR}/dist/cli.js" edit -s SESSION Q4 <<'EOF'
  { "title": "Better title?", "options": [{ "label": "A" }, { "label": "B" }], "recommended": 0 }
  EOF
  ```

- **No longer matters** → drop it (it stays visible, struck through, with your reason):

  ```bash
  node "${CLAUDE_SKILL_DIR}/dist/cli.js" drop -s SESSION Q4 <<'EOF'
  Moot: you chose memory-only state.
  EOF
  ```

- **Discussion surfaced a new question for this round** → add it to the current round instead of starting a new one. Fails once the user has sent that round; then it belongs in the next round.

  ```bash
  node "${CLAUDE_SKILL_DIR}/dist/cli.js" add -s SESSION <<'EOF'
  { "questions": [{ "title": "…?", "body": "…", "options": [] }] }
  EOF
  ```

In the thread, say in one line what you changed ("Resolved Q6 as TanStack Query + SSE cache.").

## 6. Finish

When the frontier is empty and `open` is empty, post a summary of every settled decision (by question id) and remaining risks, then wait:

```bash
node "${CLAUDE_SKILL_DIR}/dist/cli.js" summary -s SESSION <<'EOF'
### Settled
- **Q1 First user:** solo developers
EOF
```

In `docs` mode, end the summary with a `### Docs` section listing every file you created or changed (`CONTEXT.md`, each ADR).

- `summary_confirmed`: run `grill stop -s SESSION`, then print the summary in the terminal as your final output. Act on it only if the user asks.
- `summary_rejected`: its `text` is new input. Keep grilling, then post a new summary.
- `ended` (user closed the session in the UI, at any time): run `grill stop -s SESSION` and print what was settled so far.

## Terminal etiquette

Between tool calls print at most one short line (for example "Round 3 posted." or "ADR 0003 written."). All content belongs in the UI.

## Troubleshooting

- `No bridge for session …` (exit 2): the bridge is gone. It exits on its own after 30 minutes with no wait running and no browser tab open, and it can crash. Start a new one; the old session state is gone.
- `Wrong session: …` (exit 1): you used a handle that isn't yours, and it reached another session's bridge. Find the `session` your own `grill start` printed and retry with it. Never take a handle from `ps`, a log file or another session. If you can't find yours, start a new bridge.
- Exit 1 with a validation message: fix the JSON and post again.
- `grill state -s SESSION` prints the full session state.
- Bridge log path is printed by `grill start`.
