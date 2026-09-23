# Contributing

How the pieces fit together at runtime: [ARCHITECTURE.md](ARCHITECTURE.md).

## Development

Needs Node 24 (`.nvmrc`) and pnpm.

```sh
pnpm install
pnpm dev          # bridge from TypeScript on :4777 as session 4777-dev (node --watch) + Vite on :5173 proxying /api
pnpm demo         # fake Claude: posts rounds, echoes chat replies, ends in a summary
pnpm check-types
pnpm build        # web UI + bridge bundle into skills/better-grill-base/dist
```

Open http://localhost:5173 after `pnpm dev`, then run `pnpm demo` in a second terminal.

The dev bridge runs in plain mode. For the docs-mode UI, run it with `pnpm --filter @better-grill/bridge dev --mode docs` (and Vite with `pnpm --filter @better-grill/web dev`).

To use your checkout from real Claude Code sessions, either load it as a plugin with `claude --plugin-dir .`, or symlink the skill:

```sh
for s in better-grill better-grill-docs better-grill-base; do ln -s "$PWD/skills/$s" ~/.claude/skills/$s; done
```

The skill runs the bundle in `skills/better-grill-base/dist`. Keep it fresh with:

```sh
pnpm dev:skill    # vite build --watch + bridge build:watch; dist/web links to apps/web/dist
```

UI changes then show up on a page refresh in a live session. Bridge changes land in the next session: the running bridge keeps its old code. `SKILL.md` edits apply the next time Claude loads the skill. `pnpm build` (also run by `npm publish`) swaps the symlink back for a copy.

Before opening a pull request: `pnpm check-types && pnpm build`.

## Layout

| Path                  | What                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| `packages/protocol`   | Zod schemas and types shared by bridge and UI: rounds, answers, events         |
| `apps/bridge`         | Node server (`server.ts`), session logic, `grill` CLI, demo, screenshot and build scripts |
| `apps/web`            | Vite + React + Tailwind + shadcn/ui (Base UI) UI                               |
| `skills/better-grill-base` | Shared `SKILL.md` Claude follows, plus the built `dist/` (bridge bundle and web UI) it runs |
| `skills/better-grill`, `skills/better-grill-docs` | Entry skills: load the base in `plain` or `docs` mode         |
| `.claude-plugin`      | Plugin manifest and the marketplace that points at the npm package             |

In development the bridge runs TypeScript directly with Node's type stripping. For release, esbuild bundles it into dependency-free JS for Node 20+.

Any change to the wire format goes in `packages/protocol` first, then bridge, UI and `SKILL.md` together.

`apps/web/src` follows [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md):

| Path                 | What                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| `app/`               | Providers and `session-screen.tsx`, which composes the features                      |
| `features/<name>/`   | `session`, `rounds`, `discussion`, `navigation`, `summary`: each with `api/`, `components/`, `hooks/`, `utils/` as needed |
| `components/ui/`     | shadcn components (Base UI, `base-nova` style). Add more with `pnpm dlx shadcn@latest add <name>` in `apps/web` |
| `components/`        | Shared app components: markdown, errors, feedback notes, brand, theme toggle         |
| `hooks/` `lib/` `utils/` `types/` `config/` | Shared hooks, bridge client + theme + lock, pure helpers, types, constants |

Features never import from each other; only `app/` combines them. Theme tokens (stone + orange accent, light and dark) live in `src/index.css`.

## Screenshots

The README images in `.github/assets/` come from the demo rounds, captured with Playwright in dark mode:

```sh
pnpm screenshots  # builds, starts a bridge, posts demo rounds, saves discussion.png and hero.png
```

The hero is `apps/bridge/scripts/hero.html` (pitch, brand mark, the app's dark tokens) with the fresh discussion shot framed in a window; edit its copy there.

Rerun it after visible UI changes. First time on a machine, Playwright may ask for `pnpm --filter @better-grill/bridge exec playwright install chromium`.

## Releasing

The plugin ships as the `better-grill` npm package; the marketplace in `.claude-plugin/marketplace.json` points at it, so nothing built is committed.

```sh
npm version patch      # bumps package.json and .claude-plugin/plugin.json together
npm publish            # prepublishOnly runs check-types and build
git push --follow-tags
```
