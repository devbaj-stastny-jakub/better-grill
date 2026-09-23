# Contributing

How the pieces fit together at runtime: [ARCHITECTURE.md](ARCHITECTURE.md).

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

Before opening a pull request: `pnpm check-types && pnpm build`.

## Layout

| Path                  | What                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| `packages/protocol`   | Zod schemas and types shared by bridge and UI: rounds, answers, events         |
| `apps/bridge`         | Node server (`server.ts`), session logic, `grill` CLI, demo, screenshot and build scripts |
| `apps/web`            | Vite + React + Tailwind + shadcn/ui (Base UI) UI                               |
| `skills/better-grill` | `SKILL.md`, plus the built `dist/` (bridge bundle and web UI) it runs          |
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
pnpm screenshots  # builds, starts a bridge, posts demo rounds, saves round.png and discussion.png
```

Rerun it after visible UI changes. First time on a machine, Playwright may ask for `pnpm --filter @better-grill/bridge exec playwright install chromium`.

## Releasing

The plugin ships as the `better-grill` npm package; the marketplace in `.claude-plugin/marketplace.json` points at it, so nothing built is committed.

```sh
npm version patch      # bumps package.json and .claude-plugin/plugin.json together
npm publish            # prepublishOnly runs check-types and build
git push --follow-tags
```
