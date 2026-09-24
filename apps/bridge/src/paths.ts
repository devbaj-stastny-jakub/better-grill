import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * The bridge runs two ways: as TypeScript from the repo (`pnpm dev`) and as the
 * esbuild bundle in skills/better-grill-base/dist, where this module is inlined into
 * cli.js and server.js and the web UI sits next to them in web/.
 */
const bundled = !import.meta.url.endsWith(".ts");

export const serverEntry = fileURLToPath(new URL(bundled ? "./server.js" : "./server.ts", import.meta.url));
export const webDist = fileURLToPath(new URL(bundled ? "./web/" : "../../web/dist/", import.meta.url));
/** How to build a visualization, printed by `grill visualize --brief`. Ships next to dist/ in the skill folder. */
export const visualizeGuide = fileURLToPath(
  new URL(bundled ? "../visualize.md" : "../../../skills/better-grill-base/visualize.md", import.meta.url),
);

/**
 * Images the user pastes into the UI, one folder per bridge. A fixed place under the
 * home folder, so SKILL.md can let Claude read them without a permission prompt.
 */
export const imagesRoot = join(homedir(), ".better-grill", "images");
