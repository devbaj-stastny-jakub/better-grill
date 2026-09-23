import { fileURLToPath } from "node:url";

/*
 * The bridge runs two ways: as TypeScript from the repo (`pnpm dev`) and as the
 * esbuild bundle in skills/better-grill/dist, where this module is inlined into
 * cli.js and server.js and the web UI sits next to them in web/.
 */
const bundled = !import.meta.url.endsWith(".ts");

export const serverEntry = fileURLToPath(new URL(bundled ? "./server.js" : "./server.ts", import.meta.url));
export const webDist = fileURLToPath(new URL(bundled ? "./web/" : "../../web/dist/", import.meta.url));
