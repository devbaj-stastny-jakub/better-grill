import { STORAGE_KEYS } from "@/config/constants.ts";
import { useCssVar } from "@/hooks/use-css-var.ts";
import { usePersistentState } from "@/hooks/use-persistent-state.ts";
import { CHAT_WIDTH, clampChatWidth } from "../utils/chat-width.ts";

/** Discussion panel width in px, remembered across reloads, clamped to the window, mirrored to `--chat-w`. */
export function useChatWidth() {
  const [stored, setWidth] = usePersistentState(STORAGE_KEYS.chatWidth, CHAT_WIDTH.initial);
  const width = clampChatWidth(stored);
  useCssVar("--chat-w", `${width}px`);
  return [width, setWidth] as const;
}
