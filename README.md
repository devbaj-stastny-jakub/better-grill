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

## Two ways to grill

<table>
<tr>
<td width="50%" valign="top">

**Grill a plan**

```
/better-grill:better-grill <plan>
```

Claude grills your plan round by round until every decision is settled, then sums them up.

</td>
<td width="50%" valign="top">

**Grill with docs**

```
/better-grill:better-grill-docs <plan>
```

The same grill, and Claude keeps a glossary (`CONTEXT.md`) and ADRs up to date as decisions settle, like `grill-with-docs`.

</td>
</tr>
</table>

For example:

```
/better-grill:better-grill a CLI that syncs my dotfiles across machines
```

Your browser opens on the session, and Claude's first round of questions lands there.

## Install

In Claude Code:

```
/plugin marketplace add devbaj-stastny-jakub/better-grill
/plugin install better-grill@better-grill
```

You also need [Node.js](https://nodejs.org) 20+ and the [`grilling`](https://github.com/mattpocock/skills) skill; the docs variant also uses `domain-modeling` from the same repo. better grill brings the UI, the skills bring the method.

## What you get

![A round in better-grill: a long question with a comparison table, Claude's recommended option picked, and the Lock in bar at the bottom](https://raw.githubusercontent.com/devbaj-stastny-jakub/better-grill/main/.github/assets/round.png)

<table>
<tr>
<td width="33%" valign="top"><b>One question at a time</b><br>Rounds step through their questions, with Claude's context, trade-offs and tables.</td>
<td width="33%" valign="top"><b>Claude's pick on each</b><br>Take it, choose another option, write your own answer, or add a note.</td>
<td width="33%" valign="top"><b>A thread per question</b><br>Push back on one question; Claude rewords, resolves, drops or adds questions.</td>
</tr>
<tr>
<td width="33%" valign="top"><b>Lock in, then send</b><br>Answer in any order, change your mind, send the round when it's settled.</td>
<td width="33%" valign="top"><b>A summary at the end</b><br>Every decision in one place. Confirm it, or keep grilling.</td>
<td width="33%" valign="top"><b>Keyboard first</b><br><kbd>↑</kbd> <kbd>↓</kbd> walk the options, <kbd>Enter</kbd> locks in, <kbd>D</kbd> opens the discussion, <kbd>[</kbd> folds the sidebar.</td>
</tr>
</table>

![A discussion thread open next to the question it is about](https://raw.githubusercontent.com/devbaj-stastny-jakub/better-grill/main/.github/assets/discussion.png)

## Built into Claude Code

- **Part of the session you're in.** One command from your current Claude Code session. No accounts, no API keys, nothing to set up.
- **Live, both ways.** Your answers reach Claude the moment you send them, and its replies in a discussion show up as soon as it writes them.
- **Claude knows your project.** The grill runs in the same conversation, so Claude asks with your code and everything you've discussed in mind.
- **Your terminal stays quiet.** The whole grill happens in the browser; the terminal just shows Claude at work.
- **Several grills at once.** Every Claude Code session gets its own grill in its own tab.

Curious about the internals? [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

Issues and pull requests welcome. Dev setup, demo and screenshots: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
