# Architecture

How better-grill connects your browser to a Claude Code session, what keeps it safe, and the CLI Claude drives it with. For dev setup see [CONTRIBUTING.md](CONTRIBUTING.md).

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

## Security

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

The full contract Claude follows (round JSON, events, when to resolve or edit) is in [skills/better-grill/SKILL.md](skills/better-grill/SKILL.md).

## Known limits

- State lives in bridge memory. Browser refresh is fine; a bridge crash loses the session.
- One Claude session per bridge. Events queue while Claude is busy and arrive as one batch.
