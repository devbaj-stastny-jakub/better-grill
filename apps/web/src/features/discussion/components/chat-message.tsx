import type { ChatMessage as Message } from "@better-grill/protocol";
import { SparklesIcon } from "lucide-react";
import { Markdown } from "@/components/markdown.tsx";

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
          {message.text}
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

export function ClaudeAvatar() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <SparklesIcon className="size-3.5" />
    </span>
  );
}
