/*
 * The skeleton around Claude's visualization fragment: the host side of the contract in
 * skills/better-grill-base/visualize.md. The frame is sandboxed (scripts only, opaque
 * origin), and the CSP below keeps the page from loading or sending anything except
 * scripts from the two CDNs the guide allows.
 */

/** Message the frame posts to the app with its content height. */
export const SIZE_MESSAGE = "better-grill:size";

/** Tallest the frame may grow, against pages that size themselves off the frame's height. */
export const MAX_FRAME_HEIGHT = 20_000;

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

/**
 * Tokens the guide promises, and the app variable each one takes its value from. The frame
 * sits on a card, so its ground is the card and its raised surface is one step up.
 */
const TOKENS: Record<string, string> = {
  "--background": "--card",
  "--foreground": "--card-foreground",
  "--card": "--popover",
  "--muted": "--muted",
  "--muted-foreground": "--muted-foreground",
  "--border": "--border",
  "--primary": "--primary",
  "--primary-foreground": "--primary-foreground",
  "--success": "--success",
  "--destructive": "--destructive",
  "--series-1": "--series-1",
  "--series-2": "--series-2",
  "--series-3": "--series-3",
  "--series-4": "--series-4",
  "--series-5": "--series-5",
  "--radius": "--radius",
};

const FONTS = `--font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif; --font-mono: "Geist Mono Variable", ui-monospace, monospace;`;

/** Reports the content height to the app whenever it changes. */
const SIZE_SCRIPT = `(() => {
  let last = -1;
  const post = () => {
    const body = document.body;
    const height = Math.ceil(Math.max(body.getBoundingClientRect().height, body.scrollHeight));
    if (height === last) return;
    last = height;
    parent.postMessage({ type: "${SIZE_MESSAGE}", height }, "*");
  };
  addEventListener("DOMContentLoaded", () => {
    new ResizeObserver(post).observe(document.body);
    post();
  });
  addEventListener("load", post);
  document.fonts?.ready.then(post);
})();`;

/** The app's current values of the tokens the frame gets. Read after the theme class is on <html>. */
export function readTokens(): string {
  const style = getComputedStyle(document.documentElement);
  return Object.entries(TOKENS)
    .map(([name, source]) => `${name}: ${style.getPropertyValue(source).trim()};`)
    .join(" ");
}

export function frameDocument({
  fragment,
  theme,
  tokens,
  fontFaces,
}: {
  fragment: string;
  theme: "light" | "dark";
  tokens: string;
  fontFaces: string;
}) {
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${fontFaces}
:root { color-scheme: ${theme}; ${tokens} ${FONTS} }
*, *::before, *::after { box-sizing: border-box; }
/* The frame grows to the page, so the page itself never scrolls. */
html { -webkit-text-size-adjust: 100%; overflow: hidden; }
body { display: flow-root; margin: 0; padding: 2px; font: 14px/1.5 var(--font-sans); color: var(--foreground); background: var(--background); -webkit-font-smoothing: antialiased; }
img, svg, video, canvas { max-width: 100%; }
[hidden] { display: none !important; }
</style>
<script>${SIZE_SCRIPT}</script>
</head>
<body>
${fragment}
</body>
</html>`;
}
