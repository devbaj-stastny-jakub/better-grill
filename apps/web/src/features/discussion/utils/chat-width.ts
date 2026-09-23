export const CHAT_WIDTH = { min: 340, initial: 440, max: 960 };

/** Widest the panel may get in this window. */
export function chatMaxWidth() {
  return Math.min(CHAT_WIDTH.max, Math.round(window.innerWidth * 0.75));
}

export function clampChatWidth(width: number) {
  return Math.round(Math.min(Math.max(width, CHAT_WIDTH.min), chatMaxWidth()));
}
