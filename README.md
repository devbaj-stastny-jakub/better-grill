<p align="center">
  <img src="https://raw.githubusercontent.com/devbaj-stastny-jakub/better-grill/main/.github/assets/hero.png" alt="better grill, the UI for the grilling skill: grilling without the terminal mess. Rounds of questions, Claude's pick on each, a discussion thread per question.">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/better-grill"><img src="https://img.shields.io/npm/v/better-grill?color=f97316" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/better-grill?color=f97316" alt="license"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/better-grill?color=f97316" alt="node"></a>
</p>

<p align="center"><b>Matt Pocock's <a href="https://github.com/mattpocock/skills"><code>grilling</code></a> skill, in a real UI.<br>Rounds, discussions, one clean send, and no mess in your terminal.</b></p>

---

## Quick start

In Claude Code:

```
/plugin marketplace add devbaj-stastny-jakub/better-grill
/plugin install better-grill@better-grill
```

Then grill anything:

```
/better-grill:better-grill a CLI that syncs my dotfiles across machines
```

Your browser opens on the session, and Claude's first round of questions lands there.

You'll need [Node.js](https://nodejs.org) 20+ and the [`grilling`](https://github.com/mattpocock/skills) skill by Matt Pocock: better-grill brings the UI, `grilling` brings the method.

## What a grill feels like

![A round in better-grill: a long question with a comparison table, Claude's recommended option picked, and the Lock in bar at the bottom](https://raw.githubusercontent.com/devbaj-stastny-jakub/better-grill/main/.github/assets/round.png)

- 🧹 **No mess in the terminal.** The whole grill happens in the browser. Your Claude Code terminal stays quiet while you answer.
- 🔥 **Rounds of sharp questions.** `grilling` maps your plan as a tree of decisions; better grill shows each round one question at a time, with context, trade-offs and tables where they help.
- 🎯 **Claude's pick on every question.** Take the recommendation, pick another option, write your own answer, or add a note to your pick.
- 💬 **Push back without derailing.** Every question has its own discussion thread. Argue it out, and Claude rewords, resolves, drops or adds questions from what you agree on.
- 🔒 **Lock in, then send.** Answer in any order and change your mind freely. When the round is settled, send it all at once and the next round builds on it.
- ✅ **A summary at the end.** When nothing is open, Claude posts every decision in one place. Confirm it, or say what's wrong and the grilling goes on.
- ⌨️ **Keyboard first.** <kbd>↑</kbd> <kbd>↓</kbd> to walk options, <kbd>Enter</kbd> to lock in, <kbd>D</kbd> to discuss, <kbd>[</kbd> to fold the sidebar.

![A discussion thread open next to the question it is about](https://raw.githubusercontent.com/devbaj-stastny-jakub/better-grill/main/.github/assets/discussion.png)

## Grill with docs

Want the decisions written down as you go? The docs variant also keeps a glossary (`CONTEXT.md`) and ADRs up to date as answers settle, like `grill-with-docs`:

```
/better-grill:better-grill-docs <what you want grilled>
```

It needs the `domain-modeling` skill from the same [mattpocock/skills](https://github.com/mattpocock/skills) repo.

## How it works

- **Runs on your Claude Code session.** It uses your existing subscription: no API key, no hosted service. The UI and its bridge run locally.
- **A small local bridge per session.** Claude Code has no port a browser could call, so better-grill starts one. Claude posts rounds to it from its Bash tool and waits in the background until you send a round or write in a discussion.
- **The bridge never calls Claude or any API.** It holds the session state and hands your answers back.
- **Locked down by default.** It listens on `127.0.0.1` only, rejects requests from other websites, and shuts down on its own after 30 idle minutes.
- **Several grills at once.** Each Claude session gets its own bridge and browser tab.

Security model, CLI reference and known limits: [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

Issues and pull requests welcome. Dev setup, demo and screenshots: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
