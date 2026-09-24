# Visualize a question

The user pressed **Visualize** on a grill question. Make one HTML page that helps them understand the question better. It shows up in the better-grill UI, in the question's Visualization view, in a sandboxed frame.

What to show and in which form is your call. Read the question, its options, the discussion and the user's note, look things up in the repo when the facts matter, and pick whatever makes it clearest: a diagram, a side-by-side comparison, a chart, a small model the user can play with, a table, or a mix. When a sentence says it faster, the page can be one figure and a sentence.

## What you get

Below this guide, `grill visualize --brief` prints:

- The question as JSON: `title`, `body` (markdown), `options` (`label`, `description`), `recommended` (an index into `options`), `recommendation`, and the user's `answer` if they gave one.
- The user's note, if any. It says what they want to focus on and wins over your own reading.
- The question's discussion so far.
- The exact commands that post the page.

## Page contract

The better-grill UI is the host. Follow this exactly, or the page breaks or gets blocked.

**Write a fragment.** No `<!doctype>`, `<html>`, `<head>` or `<body>`. The host wraps your content in a skeleton with charset, viewport and a small reset (`box-sizing: border-box`, zero body margin, body in `var(--font-sans)` at 14px on `var(--background)` in `var(--foreground)`). Start with your `<style>`, then the content, then your `<script>` at the end.

**Don't repeat the question.** The host shows the question title above the frame. Open with the visualization, not a heading that restates it.

**Theme tokens.** The host defines these on `:root`, in both themes, matching the better-grill UI:

| Token | Use |
|---|---|
| `--background` | page ground (already painted on `body`; it's the card the frame sits on) |
| `--foreground` | primary text, strokes, arrows |
| `--muted-foreground` | secondary text, captions, axis labels |
| `--card` | a raised surface, when one thing needs lifting |
| `--muted` | subtle fills, track of a slider, a quiet band |
| `--border` | hairlines, grid lines, box outlines |
| `--primary` | the accent, for the one thing that matters most in a figure |
| `--primary-foreground` | text on a `--primary` fill |
| `--success` / `--destructive` | good / bad, only when the color *means* that |
| `--series-1` … `--series-5` | categorical slots for charts, in this order (blue, aqua, violet, yellow, pink) |
| `--font-sans` / `--font-mono` | the UI's typefaces |
| `--radius` | the UI's corner radius |

Style everything through these. The host stamps `data-theme="light"` or `data-theme="dark"` on `<html>` with the tokens resolved for that theme; when the user switches theme, the page reloads in the new one. If you need a color of your own, define it on `:root` and again under `:root[data-theme="dark"]`, never only in one of them. No `prefers-color-scheme` queries: the stamp is always there. JS that needs a resolved color reads it with `getComputedStyle(document.documentElement).getPropertyValue("--primary")`.

**Type.** Use `--font-sans` for text and `--font-mono` for code, identifiers and numbers in columns. Don't load fonts. Set a small scale and stay on it (for example 12 / 14 / 16 / 20px); captions 12–13px in `--muted-foreground`; `text-wrap: balance` on headings; running text no wider than about 65 characters; uppercase labels get a little letter-spacing.

**Size and layout.** The frame is as wide as the question card: about 300px on a phone up to about 720px. The host sets the frame's height to your content's height, so never use `100vh` or fixed page heights and never make the page scroll. The body has no padding of its own (the card around it has), so content can run edge to edge. Lay out with flex or grid and `gap`; let rows wrap or stack to one column when narrow. Only a wide diagram or table may exceed the width, inside its own `overflow-x: auto` container.

**Libraries.** Most pages need none: hand-author SVG and write plain JS. When one really carries weight (D3 for a force layout, a charting library for a dense chart), load its UMD build with one pinned `<script src>` from `https://cdnjs.cloudflare.com/ajax/libs/<lib>/<exact version>/<file>` (preferred) or `https://cdn.jsdelivr.net/npm/`, placed before the script that uses it. Everything else is blocked without an error: other hosts, stylesheets, images, fonts, `fetch`, XHR, WebSocket. Inline your CSS and JS and embed any image as a `data:` URI. No Mermaid: build diagrams as inline SVG.

**Sandbox.** The page runs in a frame with scripts and nothing else:

- `localStorage`, `sessionStorage`, IndexedDB and cookies throw. Keep state in JS variables.
- `alert`, `confirm` and `prompt` do nothing. Build any confirmation into the page.
- No downloads, printing, popups, other iframes, `<object>` or `<embed>`. Don't link out; show a URL as text if it matters.
- Forms work as page UI; handle `submit` with `preventDefault()`.
- The page cannot talk to the bridge or the grill. It is read-only for the user's understanding; answers still happen in the UI.

**Size.** Keep the page well under the limit of 1,000,000 characters. Long generated path data or embedded images are a sign to simplify.

## Composing it

The page should feel like part of better grill: calm, precise, the content the only loud thing.

- **Show the real thing.** Real names from the codebase, real units and scales, the terms of the domain. Never lorem or placeholder names.
- **One figure, one claim.** Each figure sits in a `<figure>` whose `<figcaption>` says in one sentence what it shows.
- **Marks carry meaning.** Label arrows with what flows along them (`writes`, `polls every 30s`). A legend only when the same encoding repeats; otherwise put the meaning on the mark.
- **Tokens, not literals.** Every color comes from the table above. The accent is spent in one place per figure.
- **At rest first.** Everything meant to be read is visible on load, in a realistic state. Nothing waits at `opacity: 0` for a scroll or a click.
- **Interaction looks interactive.** Real `<button>`, `<input type="range">`, `<select>`, with visible labels and a visible focus state; everything works from the keyboard. Tooltips add detail but never hold the only copy of a value. Motion only when it explains something, and respect `prefers-reduced-motion`.
- **Not everything is a card.** Border, fill, radius and shadow each say "separate object". Use them for the one thing that needs lifting, not on every block.
- **Structure is information.** Numbering, labels and dividers must encode something true. Numbered steps only for a real sequence.
- **Compose repeated things as one object.** Panels side by side share the same edges, baselines, inner padding and scale, so the difference between them is the only difference.
- **Write the copy for the user.** Name things by what they recognize. Active voice. A control says what it does. Specific beats clever.
- **Avoid the generated look:** purple-to-blue gradients, emoji as markers, everything centered, a rounded shadowed card around every element, decorative 01 / 02 / 03, a giant hero.

## Inline SVG

- Size by `viewBox="0 0 W H"` and let CSS scale it (`width: 100%; height: auto`). Choose W and H for the content. Wide flows read left to right; layered stacks top to bottom.
- Strokes, text and arrowheads in `currentColor` (the `--foreground`), or a token via `fill="var(--primary)"`. Every shape gets an explicit `fill` (`none` for outlines).
- Arrowheads are a `<marker>` in `<defs>` referenced by `marker-end="url(#arrow)"`, or a small `<polygon>`.
- Text 11–13px at the rendered scale, `text-anchor` for alignment, labels of a word or three. Sentences belong in the caption.
- Align to a grid: shared baselines and even gaps make a hand diagram read as deliberate.
- Leave room in the `viewBox` for the outermost labels; nothing clipped, nothing overlapping.
- Give the `<svg>` `role="img"` and an `aria-label` carrying the same claim as the caption.
- Keep ids unique across the page (two figures both defining `#arrow` collide).

## Charts

When a chart is part of it:

1. **Pick the form before color.** Magnitude: bar or column. Trend over time: line. Part of a whole: stacked bar. Above or below a baseline: diverging bar. Before and after per item: dumbbell. A single number: a big figure with its unit, not a one-bar chart. More than about 7 classes: a table.
2. **Emphasis is usually right.** One series (the one that matters) in `--primary`, the rest in `--muted-foreground`. Use `--series-*` only when the series themselves are the subject, assigned in fixed order and following the entity, never its rank. More than five series fold into "Other" or small multiples; scatter-like forms, where any two series can sit next to each other, stay at three. Slots 2, 4 and 5 are light on the light ground, so label those series directly.
3. **One axis.** Never two y-scales on one plot. Two measures of different scale get two charts.
4. **Marks:** bars at most 24px thick with 4px rounded data ends, square at the baseline, a 2px gap between touching bars; lines 2px with round joins; markers at least 8px; area fills at about 10% opacity; grid and axes as solid 1px `--border` hairlines, never dashed.
5. **Labels:** a legend for two or more series, none for one. Label selectively (the endpoint, the extreme, the series in question), never a number on every point. Text uses text tokens, never the series color. A label that won't fit inside a bar goes outside it or into the tooltip, never clipped. Round tick values; `tabular-nums` on axis ticks and table columns.
6. **Hover:** a crosshair with one tooltip listing every series on line charts; per-mark tooltips on bars and dots, with a hit area of at least 24px. Same on keyboard focus. Insert labels with `textContent`, never `innerHTML`.
7. **Scale honestly.** One scale places marks, ticks and labels; bars start at zero; every tick names a value the chart reaches. When the numbers are estimates, say so in the caption and show where they come from.

## Build cleanly

- Close every element, double-quote attributes, give every control a label and a visible focus state.
- Watch selector specificity so one rule doesn't silently undo another's spacing.
- Scope your CSS (one wrapper class) and your JS (one IIFE); no globals besides a library's.
- Text from the question may contain `<`, `&` and quotes. Escape it when you write it into the HTML, and use `textContent` in scripts.

## Process

1. Read the brief. Look up the facts the page depends on.
2. Decide what the page shows and how. Plan it in a few lines before writing.
3. Write the page once, carefully.
4. Don't build a render-and-fix loop: no repeated screenshots, no running the script under node, no DOM probing. A careful write already settled it.
5. Post it with the command at the end of the brief: the page goes on stdin, in a quoted heredoc (or `< page.html` from a file). It replaces any earlier page for the question. The command exits 1 with the reason if the page is rejected (too long, empty); fix it and post again.
6. If there's nothing useful to visualize (the question is purely about wording, or the facts aren't available), don't post a filler page. Use the `--fail` command from the brief to tell the user why in one sentence, and what would help.
