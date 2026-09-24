import type { ChatMessage as Message } from "@better-grill/protocol";
import { SparklesIcon } from "lucide-react";
import { Coals } from "@/components/feedback/coals.tsx";
import { ImageText } from "@/components/image-editor/image-text.tsx";
import { Markdown } from "@/components/markdown.tsx";

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
          <ImageText text={message.text} images={message.images} tone="inverse" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 animate-in fade-in-0 slide-in-from-bottom-1">
      <ClaudeAvatar />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Claude</p>
        <Markdown className="text-sm">{message.text}</Markdown>
      </div>
    </div>
  );
}

/** Claude's reply on its way: glowing coals where the reply will land. `queued`: Claude is busy elsewhere. */
export function ClaudePending({ queued }: { queued: boolean }) {
  return (
    <div role="status" className="flex items-end gap-2.5 animate-in fade-in-0 slide-in-from-bottom-1">
      <ClaudeAvatar />
      <span className="flex h-7 items-center rounded-2xl rounded-bl-sm bg-muted px-3 text-base text-primary">
        <Coals />
        <span className="sr-only">{queued ? "Queued. Claude is busy and will answer next." : "Claude is reading your message."}</span>
      </span>
    </div>
  );
}

export function ClaudeAvatar() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <SparklesIcon className="size-3.5" />
    </span>
  );
}
