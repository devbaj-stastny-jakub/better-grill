# better grill

Run grill sessions in a browser instead of the terminal. Claude posts rounds of questions with options and a recommendation; you lock in each question when ready (pick, type your own answer, or both), or open a discussion thread per question. When everything is locked in, **Send to Claude** sends the round; discussion messages go right away. From a discussion, Claude can resolve, edit, drop or add questions in the UI. Everything runs through your open Claude Code session, so it uses your Claude Code subscription. No API key.

## Requirements

- [Claude Code](https://code.claude.com)
- [Node.js](https://nodejs.org) 20 or newer on your `PATH`
- Matt Pocock's `grilling` skill from [mattpocock/skills](https://github.com/mattpocock/skills). better-grill brings the UI; `grilling` brings the method (design tree, frontier, recommended answers).

## Install

In Claude Code:

```
/plugin marketplace add devbaj-stastny-jakub/better-grill
/plugin install better-grill@better-grill
```

Then, in any session:

```
/better-grill:better-grill <what you want grilled>
```

Your browser opens on the session. Claude keeps the terminal quiet and talks to you in the UI until you confirm the final summary.

Several Claude sessions can grill at the same time; each gets its own bridge, port and browser tab.

## How it talks to Claude Code

Claude Code has no port or socket to call, so the browser cannot reach it. A small local **bridge** sits between them:

```
Claude Code session                 bridge (node, 127.0.0.1)            browser
───────────────────                 ────────────────────────            ───────
grill round  ── POST /api/rounds ─▶ session state ── SSE /api/stream ─▶ UI
grill wait   ── GET  /api/wait ───▶ (held open)
                                    ◀── POST answer / chat ──────────── click
             ◀── events JSON ─────  releases the wait
grill reply  ── POST /reply ──────▶ ── SSE ────────────────────────────▶ chat thread
```

- Claude drives the bridge with the `grill` CLI from its Bash tool.
- `grill wait` is a long-poll Claude runs in the background. It returns when you press Send or write in a discussion, and Claude Code wakes the session with the events.
- The bridge never calls Claude. It only holds state and releases waits.
- A bridge exits on its own after 30 minutes with no wait running, no browser tab open and no requests.

### Security

The bridge listens on `127.0.0.1` only and:

- refuses requests whose `Host` isn't localhost (DNS rebinding),
- refuses requests whose `Origin` isn't the page it serves, and requires JSON bodies, so other websites open in your browser can't post into the session,
- refuses Claude-side calls without its session id (see below).

## CLI

The plugin runs it as `node <skill dir>/dist/cli.js`; outside Claude Code it is also `npx better-grill`.

```
grill start [--title T] [--port N] [--no-open]   # prints {"session":"62950-a1b2c3","url","log"}
grill round   -s SESSION < round.json
grill add     -s SESSION < questions.json      # into the latest round, while unsent
grill wait    -s SESSION
grill reply   -s SESSION Q3 < text.md
grill resolve -s SESSION Q3 < resolution.json  # {"options":[1],"text":"…"}
grill edit    -s SESSION Q3 < patch.json
grill drop    -s SESSION Q3 < reason.txt
grill summary -s SESSION < summary.md
grill state   -s SESSION
grill stop    -s SESSION
```

Each `grill start` runs its own bridge on a free port. The session handle is `<port>-<id>`: the CLI sends the id in an `x-grill-session` header and the bridge refuses Claude-side calls whose id doesn't match, so a session that mixes up ports gets an error instead of writing into someone else's grill.

Exit codes: 0 ok, 1 bridge rejected the input, 2 usage error or bridge unreachable.

## Development

Needs Node 24 (`.nvmrc`) and pnpm.

```sh
pnpm install
pnpm dev          # bridge from TypeScript on :4777 as session 4777-dev (node --watch) + Vite on :5173 proxying /api
pnpm demo         # fake Claude: posts rounds, echoes chat replies, ends in a summary
pnpm check-types
pnpm build        # web UI + bridge bundle into skills/better-grill/dist
```

Open http://localhost:5173 after `pnpm dev`, then run `pnpm demo` in a second terminal.

To use your checkout from real Claude Code sessions, either load it as a plugin with `claude --plugin-dir .`, or symlink the skill:

```sh
ln -s "$PWD/skills/better-grill" ~/.claude/skills/better-grill
```

The skill runs the bundle in `skills/better-grill/dist`, so rebuild after bridge changes (`pnpm --filter @better-grill/bridge build:watch` keeps it fresh).

### Layout

| Path                    | What                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `packages/protocol`     | Zod schemas and types shared by bridge and UI: rounds, answers, events         |
| `apps/bridge`           | Node server (`server.ts`), session logic, `grill` CLI, demo and build scripts  |
| `apps/web`              | Vite + React + Tailwind + shadcn/ui (Base UI) UI                               |
| `skills/better-grill`   | `SKILL.md`, plus the built `dist/` (bridge bundle and web UI) it runs          |
| `.claude-plugin`        | Plugin manifest and the marketplace that points at the npm package             |

In development the bridge runs TypeScript directly with Node's type stripping. For release, esbuild bundles it into dependency-free JS for Node 20+.

`apps/web/src` follows [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md):

| Path                 | What                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| `app/`               | Providers and `session-screen.tsx`, which composes the features                      |
| `features/<name>/`   | `session`, `rounds`, `discussion`, `navigation`, `summary`: each with `api/`, `components/`, `hooks/`, `utils/` as needed |
| `components/ui/`     | shadcn components (Base UI, `base-nova` style). Add more with `pnpm dlx shadcn@latest add <name>` in `apps/web` |
| `components/`        | Shared app components: markdown, errors, feedback notes, brand, theme toggle         |
| `hooks/` `lib/` `utils/` `types/` `config/` | Shared hooks, bridge client + theme + lock, pure helpers, types, constants |

Features never import from each other; only `app/` combines them. Theme tokens (stone + orange accent, light and dark) live in `src/index.css`.

### Releasing

The plugin ships as the `better-grill` npm package; the marketplace in `.claude-plugin/marketplace.json` points at it, so nothing built is committed.

```sh
npm version patch      # bumps package.json and .claude-plugin/plugin.json together
npm publish            # prepublishOnly runs check-types and build
git push --follow-tags
```

## Known limits

- State lives in bridge memory. Browser refresh is fine; a bridge crash loses the session.
- One Claude session per bridge. Events queue while Claude is busy and arrive as one batch.

## License

[MIT](LICENSE)
