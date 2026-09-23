/**
 * Types a line break at the caret, as if the user had pressed Enter. Goes
 * through the editing pipeline (undo works, React sees an input event).
 */
export function insertNewline(field: HTMLTextAreaElement) {
  field.focus();
  if (document.execCommand("insertText", false, "\n")) return;
  // execCommand is gone in this browser: edit the value and tell React.
  field.setRangeText("\n", field.selectionStart, field.selectionEnd, "end");
  field.dispatchEvent(new Event("input", { bubbles: true }));
}
