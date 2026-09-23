import type { ReactNode } from "react";
import { ResizeHandle } from "@/components/resize-handle.tsx";
import { useChatWidth } from "../hooks/use-chat-width.ts";
import { CHAT_WIDTH, chatMaxWidth } from "../utils/chat-width.ts";

/**
 * Fixed right-hand slot for the discussion, below the header. Sized by `--chat-w`,
 * which the page also reads to make room on wide screens.
 */
export function DiscussionDock({ children }: { children: ReactNode }) {
  const [width, setWidth] = useChatWidth();
  return (
    <div className="fixed top-14 right-0 bottom-0 z-40 w-[min(100vw,var(--chat-w))] shadow-2xl animate-in fade-in-0 slide-in-from-right-4 animation-duration-200 xl:shadow-none">
      <ResizeHandle
        side="right"
        cssVar="--chat-w"
        width={width}
        min={CHAT_WIDTH.min}
        max={chatMaxWidth()}
        initial={CHAT_WIDTH.initial}
        onResize={setWidth}
        label="Resize discussion"
      />
      {children}
    </div>
  );
}
