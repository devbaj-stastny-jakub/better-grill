/*
 * Keyboard path through the question on screen. Every option button and answer
 * textarea of an open editor is an "answer item"; ↑/↓ walks them in page order.
 */
const ITEM = "[data-answer-item]:not(:disabled)";

function focusItem(item: HTMLElement) {
  // focusVisible: show the ring even when focus moved by code after a mouse click.
  item.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  item.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
  focusItem(next);
  return true;
}

function focusFirstAnswerIn(root: ParentNode) {
  const item = root.querySelector<HTMLElement>(ITEM);
  if (item) focusItem(item);
  return !!item;
}

/** A new step is on screen: put the keyboard on its picked option (so Enter keeps it), else its first answer item. */
export function focusStep() {
  if (isTyping()) return;
  const picked = document.querySelector<HTMLElement>(`${ITEM}[aria-checked=true]`);
  if (picked) focusItem(picked);
  else focusFirstAnswerIn(document);
}
