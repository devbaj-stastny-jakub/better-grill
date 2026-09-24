/*
 * The page `pnpm demo` posts for a Visualize request: the question's options behind a
 * switch, built to the contract in skills/better-grill-base/visualize.md. A stand-in for
 * what Claude makes, so the view, the frame, the tokens and both themes can be checked.
 */
import type { Question } from "@better-grill/protocol";

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function demoVisualization(question: Question, note?: string): string {
  const options = question.options.length > 0 ? question.options : [{ id: "a", label: "Your own answer" }];
  const picked = Math.max(
    0,
    options.findIndex((o) => o.id === question.recommended),
  );
  // Made-up scores, so the chart has something to show. Labelled as such in the caption.
  const scores = options.map((_, i) => ({ effort: 30 + ((i * 37) % 60) }));
  const rowHeight = 36;
  const chartHeight = options.length * rowHeight + 28;

  return `<style>
  .demo { display: grid; gap: 20px; }
  .demo figure { margin: 0; display: grid; gap: 8px; }
  .demo figcaption { font-size: 12px; color: var(--muted-foreground); }
  .demo .switch { display: flex; flex-wrap: wrap; gap: 6px; }
  .demo button { font: inherit; font-size: 13px; padding: 4px 10px; border-radius: calc(var(--radius) * 0.8); border: 1px solid var(--border); background: var(--background); color: var(--foreground); cursor: pointer; }
  .demo button[aria-pressed="true"] { border-color: var(--primary); color: var(--primary); }
  .demo button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .demo .pick { font-size: 13px; line-height: 1.5; min-height: 3em; }
  .demo svg { width: 100%; height: auto; display: block; color: var(--foreground); }
  .demo .tag { font-size: 11px; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: .04em; }
</style>
<div class="demo">
  ${note ? `<p class="tag">Demo page · you asked: ${escape(note)}</p>` : `<p class="tag">Demo page</p>`}
  <figure>
    <div class="switch" role="group" aria-label="Option">
      ${options.map((o, i) => `<button type="button" data-i="${i}" aria-pressed="${i === picked}">${escape(o.label)}</button>`).join("")}
    </div>
    <svg viewBox="0 0 640 120" role="img" aria-label="What the picked option leads to">
      <defs><marker id="demo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
      <rect x="8" y="36" width="150" height="48" rx="8" fill="var(--card)" stroke="var(--border)"/>
      <text x="83" y="65" text-anchor="middle" font-size="13" fill="currentColor">${escape(question.id)}</text>
      <line x1="158" y1="60" x2="238" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#demo-arrow)"/>
      <text x="198" y="50" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">you pick</text>
      <rect id="demo-choice" x="242" y="30" width="200" height="60" rx="8" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <text id="demo-choice-label" x="342" y="65" text-anchor="middle" font-size="13" fill="currentColor"></text>
      <line x1="442" y1="60" x2="522" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#demo-arrow)"/>
      <text x="482" y="50" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">leads to</text>
      <rect x="526" y="36" width="106" height="48" rx="8" fill="var(--muted)"/>
      <text x="579" y="65" text-anchor="middle" font-size="13" fill="currentColor">next round</text>
    </svg>
    <p class="pick" id="demo-description"></p>
    <figcaption>The picked option and what it commits you to. Switch options above.</figcaption>
  </figure>
  <figure>
    <svg viewBox="0 0 640 ${chartHeight}" role="img" aria-label="Effort per option, made-up numbers">
      ${[0, 50, 100].map((t) => `<line x1="${200 + t * 4}" y1="0" x2="${200 + t * 4}" y2="${chartHeight - 20}" stroke="var(--border)"/><text x="${200 + t * 4}" y="${chartHeight - 4}" text-anchor="middle" font-size="11" fill="var(--muted-foreground)" style="font-variant-numeric: tabular-nums">${t}</text>`).join("")}
      ${options
        .map((o, i) => {
          const y = i * rowHeight + 8;
          const width = scores[i]!.effort * 4;
          return `<text x="188" y="${y + 15}" text-anchor="end" font-size="12" fill="currentColor">${escape(o.label.slice(0, 26))}</text>
      <rect data-bar="${i}" x="200" y="${y + 3}" width="${width}" height="16" rx="4" fill="var(--muted-foreground)" opacity=".5"/>
      <text x="${206 + width}" y="${y + 15}" font-size="11" fill="var(--muted-foreground)">${scores[i]!.effort}</text>`;
        })
        .join("")}
    </svg>
    <figcaption>Effort to build each option, 0–100. Made-up demo numbers; the picked option is in the accent.</figcaption>
  </figure>
</div>
<script>
(() => {
  const options = ${JSON.stringify(options.map((o) => ({ label: o.label, description: o.description ?? "" }))).replace(/</g, "\\u003c")};
  const buttons = document.querySelectorAll(".demo [data-i]");
  const show = (i) => {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.i) === i)));
    document.getElementById("demo-choice-label").textContent = options[i].label.slice(0, 28);
    document.getElementById("demo-description").textContent = options[i].description || "No description.";
    document.querySelectorAll("[data-bar]").forEach((bar) => {
      const on = Number(bar.dataset.bar) === i;
      bar.setAttribute("fill", on ? "var(--primary)" : "var(--muted-foreground)");
      bar.setAttribute("opacity", on ? "1" : ".5");
    });
  };
  buttons.forEach((b) => b.addEventListener("click", () => show(Number(b.dataset.i))));
  show(${picked});
})();
</script>`;
}
