import type { RegisterableHotkey } from "@tanstack/react-hotkeys";

/**
 * Every keyboard shortcut in the app, in one place. `Mod` is ⌘ on macOS and Ctrl elsewhere.
 * Inside the answer and discussion boxes the image text editor handles Enter itself
 * (submitAnswer / sendChat, newLine), because it has to act before its own key handling.
 */
export const HOTKEYS = {
  /** Lock in the question you last clicked, from anywhere but a text box. */
  lockIn: "Mod+Enter",
  /** On an option: pick it (single-select) and lock in. In the answer box: lock in. */
  submitAnswer: "Enter",
  /** New line in the answer and discussion boxes (Shift+Enter works too). */
  newLine: "Mod+Enter",
  /** Walk options and answer fields of the question on screen. */
  nextAnswer: "ArrowDown",
  previousAnswer: "ArrowUp",
  /** Send the discussion draft. */
  sendChat: "Enter",
  /** Close the discussion when the draft is empty. */
  closeChat: "Escape",
  /** Open or close the discussion of the question on screen. */
  discuss: "D",
  /** Collapse or expand the sidebar. ⌘B also works (shadcn sidebar built-in). */
  toggleSidebar: "[",
} as const satisfies Record<string, RegisterableHotkey>;
