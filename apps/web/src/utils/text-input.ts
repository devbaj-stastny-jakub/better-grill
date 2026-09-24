/**
 * The caret sits at the start (-1) or the end (1) of a text box, with nothing selected.
 * Arrow keys use it to leave the box only once the caret can't move further.
 */
export function caretAtEdge(field: HTMLElement, step: 1 | -1) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed) return false;
  const caret = selection.getRangeAt(0);
  if (!field.contains(caret.startContainer)) return false;
  const rest = document.createRange();
  rest.selectNodeContents(field);
  if (step === -1) rest.setEnd(caret.startContainer, caret.startOffset);
  else rest.setStart(caret.endContainer, caret.endOffset);
  // Image pills carry their label as text, so a pill between caret and edge counts.
  return rest.toString().length === 0;
}
