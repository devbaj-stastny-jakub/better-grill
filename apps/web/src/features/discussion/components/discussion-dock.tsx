import type { ReactNode } from "react";
import { ResizeHandle } from "@/components/resize-handle.tsx";
import { cn } from "@/lib/utils.ts";
import { useChatWidth } from "../hooks/use-chat-width.ts";
import { CHAT_WIDTH, chatMaxWidth } from "../utils/chat-width.ts";

/** Slide time, matching the sidebar's 200ms linear. Keep the panel mounted this long after closing. */
export const DISCUSSION_DOCK_MS = 200;

/**
 * Fixed right-hand slot for the discussion, floating full height beside the header.
 * Sized by `--chat-w` (the gap to the screen edge included), which the page also
 * reads to make room. Always mounted so it can slide in and out.
 */
export function DiscussionDock({ open, children }: { open: boolean; children: ReactNode }) {
  const [width, setWidth] = useChatWidth();
  return (
    <div
      data-slot="discussion-dock"
      inert={!open}
      className={cn(
        "fixed inset-y-0 right-0 z-40 w-[min(100vw,var(--chat-w))] py-3 pr-3 transition-transform duration-200 ease-linear",
        !open && "translate-x-full",
      )}
    >
      {open && (
        <ResizeHandle
          side="right"
          cssVar="--chat-w"
          width={width}
          min={CHAT_WIDTH.min}
          max={chatMaxWidth()}
          initial={CHAT_WIDTH.initial}
          onResize={setWidth}
          label="Resize discussion"
          // Sit in the gap left of the panel.
          className="-left-3"
        />
      )}
      <div className="h-full overflow-hidden rounded-xl border shadow-md">{children}</div>
    </div>
  );
}
