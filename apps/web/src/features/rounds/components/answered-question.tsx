import type { Question } from "@better-grill/protocol";
import { CircleCheckIcon, PencilIcon, SparklesIcon } from "lucide-react";
import { Markdown } from "@/components/markdown.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import type { LockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { answerLabels } from "@/utils/question.ts";
import { anchors } from "@/utils/scroll.ts";
import { DiscussButton } from "./discuss-button.tsx";

type Props = {
  question: Question;
  lock: LockReason;
  discussing: boolean;
  unread: number;
  onDiscuss: () => void;
  onChange: () => void;
};

/** Locked-in answer, collapsed to one row. */
export function AnsweredQuestion({ question, lock, discussing, unread, onDiscuss, onChange }: Props) {
  const answer = question.answer;
  const labels = answerLabels(question);
  const sent = !!answer?.sent;

  return (
    <Card
      id={anchors.question(question.id)}
      size="sm"
      className={cn("scroll-mt-20 px-4 transition-shadow", discussing && "ring-1 ring-primary/45")}
    >
      <div className="flex items-start gap-3">
        <Tooltip>
          <TooltipTrigger
            render={<span />}
            className="mt-0.5 shrink-0 text-success"
            aria-label={sent ? "Sent to Claude" : "Locked in, not sent yet"}
          >
            {sent ? <CircleCheckIcon className="size-5 fill-success text-background" /> : <CircleCheckIcon className="size-5" />}
          </TooltipTrigger>
          <TooltipContent>{sent ? "Sent to Claude" : "Locked in, not sent yet"}</TooltipContent>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{question.id}</span>
            <h3 className="text-sm font-medium text-muted-foreground">{question.title}</h3>
          </div>
          {answer?.by === "claude" && (
            <Badge variant="secondary" className="mt-1.5 bg-primary/10 text-primary">
              <SparklesIcon data-icon="inline-start" />
              Resolved in discussion by Claude · change it if that's wrong
            </Badge>
          )}
          {labels.length > 0 && <p className="mt-1 text-sm font-semibold">{labels.join(" + ")}</p>}
          {answer?.text &&
            (answer.by === "claude" ? (
              <Markdown className="mt-1 text-sm">{answer.text}</Markdown>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground italic">{answer.text}</p>
            ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DiscussButton count={question.chat.length} unread={unread} active={discussing} onClick={onDiscuss} compact />
          {!lock && (
            <Button variant="ghost" size="sm" onClick={onChange}>
              <PencilIcon data-icon="inline-start" />
              Change
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
