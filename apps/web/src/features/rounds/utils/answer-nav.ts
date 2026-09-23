/*
 * Keyboard path through the open questions. Every option button and answer
 * textarea of an open editor is an "answer item"; ↑/↓ walks them in page order.
 */
const ITEM = "[data-answer-item]:not(:disabled)";
const EDITOR = "[data-question-editor]";
/** Space the sticky header takes at the top, and the send bar at the bottom. */
const TOP_RESERVE = 80;
const BOTTOM_RESERVE = 120;

/**
 * How to scroll after focusing:
 * - "reveal": entering a question. Show it from its top (badge, title) when the
 *   focused item still fits on screen that way, otherwise just the item.
 * - "nearest": moving inside a question. Scroll only as much as needed.
 * - "none": someone else scrolls (a new round scrolls to its header).
 */
type Scroll = "reveal" | "nearest" | "none";

function focusItem(item: HTMLElement, scroll: Scroll) {
  // focusVisible: show the ring even when focus moved by code after a mouse click.
  item.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  const card = item.closest<HTMLElement>(EDITOR);
  if (scroll === "reveal" && card && fitsFromTop(card, item)) revealCard(card);
  else if (scroll !== "none") item.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function fitsFromTop(card: HTMLElement, item: HTMLElement) {
  const span = item.getBoundingClientRect().bottom - card.getBoundingClientRect().top;
  return span <= window.innerHeight - TOP_RESERVE - BOTTOM_RESERVE;
}

/** Card top lands under the sticky header (its `scroll-mt` holds the gap). */
function revealCard(card: HTMLElement) {
  card.scrollIntoView({ block: "start", behavior: "smooth" });
}

/** Someone is typing somewhere (chat, an answer): don't pull focus away. */
function isTyping() {
  const element = document.activeElement;
  return !!element && element !== document.body && !!element.closest("input, textarea, [contenteditable=true]");
}

/** Focus the next (1) or previous (-1) answer item. False when there is none. */
export function moveAnswerFocus(from: HTMLElement, step: 1 | -1) {
  const items = [...document.querySelectorAll<HTMLElement>(ITEM)];
  const next = items[items.indexOf(from) + step];
  if (!items.includes(from) || !next) return false;
  const sameQuestion = next.closest(EDITOR) === from.closest(EDITOR);
  focusItem(next, sameQuestion ? "nearest" : "reveal");
  return true;
}

export function focusFirstAnswerIn(root: ParentNode, scroll: Scroll = "nearest") {
  const item = root.querySelector<HTMLElement>(ITEM);
  if (item) focusItem(item, scroll);
  return !!item;
}

/*
 * The question just locked in collapses to a one-line row a moment later (when
 * the bridge confirms), which pulls everything below it up. Remember where we
 * went so we can scroll there again once that happened.
 */
let pendingReveal: HTMLElement | null = null;

/** After locking in `card`, carry on to the next open question below it. */
export function focusNextQuestionAfter(card: HTMLElement) {
  const editors = [...document.querySelectorAll<HTMLElement>(EDITOR)];
  const next = editors.slice(editors.indexOf(card) + 1).find((editor) => focusFirstAnswerIn(editor, "reveal"));
  pendingReveal = next ?? null;
  return !!next;
}

/** An editor went away (collapsed to its answer): settle the scroll started by `focusNextQuestionAfter`. */
export function settleReveal() {
  const card = pendingReveal;
  pendingReveal = null;
  const item = card?.isConnected ? card.querySelector<HTMLElement>(ITEM) : null;
  if (card && item && card.contains(document.activeElement) && fitsFromTop(card, item)) revealCard(card);
}

/** A round arrived (or the page loaded): first open question in it, else the first open one anywhere. */
export function focusRound(round: HTMLElement | null) {
  if (isTyping()) return;
  if (round && focusFirstAnswerIn(round, "none")) return;
  focusFirstAnswerIn(document);
}
