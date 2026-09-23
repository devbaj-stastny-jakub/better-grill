import type { Question } from "@better-grill/protocol";
import { cn } from "@/lib/utils.ts";

function tone(question: Question) {
  if (question.status === "dropped") return "border border-dashed border-muted-foreground/40 text-muted-foreground line-through";
  if (question.status === "answered") return question.answer?.sent ? "bg-success text-background" : "bg-success/15 text-success";
  return "border-[1.5px] border-muted-foreground/40 text-muted-foreground";
}

type Props = { question: Question; attention?: boolean; pending?: boolean };

/**
 * Question number in a status-coloured circle: open (gray ring), locked in (green tint),
 * sent (solid green), dropped (dashed). The dot only shows in the collapsed sidebar.
 */
export function QuestionChip({ question, attention = false, pending = false }: Props) {
  return (
    <span
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
        tone(question),
      )}
    >
      {question.id.replace(/^\D+/, "")}
      {attention && (
        <span
          className={cn(
            "absolute -top-1 -right-1 hidden size-2 rounded-full bg-primary ring-2 ring-sidebar group-data-[collapsible=icon]:block",
            pending && "animate-pulse",
          )}
        />
      )}
    </span>
  );
}
