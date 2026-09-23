# better-grill

[![npm](https://img.shields.io/npm/v/better-grill)](https://www.npmjs.com/package/better-grill)
[![license](https://img.shields.io/npm/l/better-grill)](LICENSE)
[![node](https://img.shields.io/node/v/better-grill)](https://nodejs.org)

Grill sessions for Claude Code, in your browser instead of the terminal.

![A grill round in better-grill: one question locked in, the next with Claude's recommended option picked](https://raw.githubusercontent.com/devbaj-stastny-jakub/better-grill/main/.github/assets/round.png)

A grill session is Claude interviewing you about a plan until nothing is left unsaid. It maps the decisions as a tree, asks every question it can answer right now in one round with a recommended answer each, and keeps going until every branch is settled. The method comes from Matt Pocock's [`grilling`](https://github.com/mattpocock/skills) skill; better-grill gives it a proper UI.

Why a browser:

- **Options side by side**, each with a description and Claude's pick marked, instead of a wall of terminal text.
- **A discussion thread per question.** Push back on one question without derailing the rest; Claude can reword, resolve, drop or add questions from the talk.
- **Answer at your own pace.** Lock in questions in any order, change your mind, then send the whole round at once.
- **Runs on your Claude Code session.** Uses your existing subscription. No API key, no hosted service.

## Requirements

- [Claude Code](https://code.claude.com)
- [Node.js](https://nodejs.org) 20 or newer on your `PATH`
- The `grilling` skill from [mattpocock/skills](https://github.com/mattpocock/skills). better-grill brings the UI; `grilling` brings the method.

## Install

In Claude Code:

```
/plugin marketplace add devbaj-stastny-jakub/better-grill
/plugin install better-grill@better-grill
```

## Usage

In any Claude Code session:

```
/better-grill:better-grill <what you want grilled>
```

1. Your browser opens on the session. The terminal stays quiet; everything happens in the UI.
2. Claude posts a round of questions. For each one, pick an option, write your own answer, or both, then **Lock in**.
3. Not sure about a question? Hit **Discuss** and talk it through. Claude answers in the thread and updates the question when you agree on something.
4. When every question is locked in, **Send to Claude**. The next round builds on your answers.
5. When nothing is left open, Claude posts a summary of every decision. Confirm it, or say what's wrong and the grilling continues.

![A discussion thread next to the question it is about](https://raw.githubusercontent.com/devbaj-stastny-jakub/better-grill/main/.github/assets/discussion.png)

Several Claude sessions can grill at the same time; each gets its own browser tab.

## How it works

- Claude Code has no port the browser could call, so better-grill starts a small local **bridge** server for each session.
- Claude talks to the bridge with a CLI from its Bash tool: it posts rounds, then waits in the background until you send a round or write in a discussion.
- The bridge never calls Claude or any API. It holds the session state and hands your answers back.
- It listens on `127.0.0.1` only, rejects requests from other websites, and shuts down on its own after 30 idle minutes.

Details, security model, CLI reference and known limits: [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

Issues and pull requests welcome. Dev setup: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
