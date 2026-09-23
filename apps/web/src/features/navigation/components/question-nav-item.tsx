import type { Question } from "@better-grill/protocol";
import { MessageSquareIcon } from "lucide-react";
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { answerPreview, awaitingClaude } from "@/utils/question.ts";
import { QuestionChip } from "./question-chip.tsx";

type Props = {
  question: Question;
  active: boolean;
  unread: number;
  onJump: () => void;
  onOpenChat: () => void;
};

export function QuestionNavItem({ question, active, unread, onJump, onOpenChat }: Props) {
  const pending = awaitingClaude(question);
  const attention = pending || unread > 0;
  const hasChat = question.chat.length > 0 || pending;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={`${question.id} · ${question.title}`}
        onClick={onJump}
        className="h-auto items-start py-1.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-1.5!"
      >
        <QuestionChip question={question} attention={attention} pending={pending} />
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span
            className={cn(
              "line-clamp-2 leading-snug",
              question.status === "dropped" && "text-muted-foreground line-through",
              question.status === "answered" && "text-muted-foreground",
            )}
          >
            {question.title}
          </span>
          {question.status === "answered" && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground/80">{answerPreview(question)}</span>
          )}
        </div>
      </SidebarMenuButton>
      {hasChat && (
        <SidebarMenuAction onClick={onOpenChat} aria-label={`Open discussion for ${question.id}`} className="top-1.5!">
          <MessageSquareIcon className={cn(!attention && "text-muted-foreground")} />
          {attention && (
            <span
              className={cn("absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-sidebar", pending && "animate-pulse")}
            />
          )}
        </SidebarMenuAction>
      )}
    </SidebarMenuItem>
  );
}
