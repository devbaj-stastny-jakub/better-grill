/*
 * Bundles the bridge into skills/better-grill-base/dist: cli.js and server.js as plain
 * JS with no dependencies (protocol and zod inlined), plus the built web UI in web/.
 * This folder is what ships in the plugin. `--watch` rebuilds the bridge on change and
 * links web/ to apps/web/dist instead of copying it, so `vite build --watch` output shows
 * up on a page refresh in a live session.
 */
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { context, type BuildOptions } from "esbuild";

const MIN_NODE = 20;
const out = fileURLToPath(new URL("../../../skills/better-grill-base/dist/", import.meta.url));
const web = fileURLToPath(new URL("../../web/dist/", import.meta.url));
const watch = process.argv.includes("--watch");

rmSync(out, { recursive: true, force: true });
if (watch) {
  mkdirSync(web, { recursive: true });
  mkdirSync(out, { recursive: true });
  symlinkSync(web, `${out}web`, "junction");
} else {
  if (!existsSync(web)) {
    console.error("apps/web/dist is missing. Run `pnpm build` from the repo root.");
    process.exit(1);
  }
  cpSync(web, `${out}web`, { recursive: true });
}

// Runs before any bundled code, so an old Node gets a clear message instead of a syntax error.
const nodeCheck = `if (Number(process.versions.node.split(".")[0]) < ${MIN_NODE}) { console.error("better-grill needs Node.js ${MIN_NODE} or newer, found " + process.version + ". Install it from https://nodejs.org"); process.exit(2); }`;

const options: BuildOptions = {
  entryPoints: { cli: "src/cli.ts", server: "src/server.ts" },
  outdir: out,
  bundle: true,
  platform: "node",
  format: "esm",
  target: `node${MIN_NODE}`,
  banner: { js: nodeCheck }, // cli.ts keeps its own #! line on top
  minify: true,
  logLevel: "info",
};

const ctx = await context(options);
if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
