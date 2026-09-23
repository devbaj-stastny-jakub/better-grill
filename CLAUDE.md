# better grill

Browser UI for grill sessions driven by an open Claude Code session. User-facing overview: [README.md](README.md). Bridge, security and CLI: [ARCHITECTURE.md](ARCHITECTURE.md). Dev setup, layout, screenshots, releasing: [CONTRIBUTING.md](CONTRIBUTING.md). Skill contract Claude follows: [skills/better-grill-base/SKILL.md](skills/better-grill-base/SKILL.md).

- pnpm workspace: `packages/protocol` (shared zod schemas), `apps/bridge` (node server + `grill` CLI), `apps/web` (Vite + React 19 + Tailwind 4). Repo root is also the published npm package and Claude Code plugin (`.claude-plugin/`).
- Bridge is run by Node 24 type stripping in dev: erasable TS only (no enums, no parameter properties), relative imports end in `.ts`. It ships as an esbuild bundle for Node 20+ (`skills/better-grill-base/dist`), so no Node APIs newer than 20, and find files through `apps/bridge/src/paths.ts`.
- Users need Node 20+ and the `grilling` skill (mattpocock/skills); SKILL.md checks both.
- Web follows bulletproof-react: code lives in `src/features/<name>`, features don't import each other, `src/app` composes them. UI primitives are shadcn on Base UI in `src/components/ui` (use the shadcn CLI, don't hand-roll). Colours only via theme tokens in `src/index.css`. Keyboard shortcuts: TanStack Hotkeys (`useHotkey`), all declared in `src/config/hotkeys.ts`, shown with `HotkeyHint`.
- Any change to the wire format goes in `packages/protocol` first, then bridge, UI and SKILL.md together.
- Before finishing: `pnpm check-types && pnpm build`. UI changes: `pnpm dev` + `pnpm demo` to see them.
