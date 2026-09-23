import type { Question } from "@better-grill/protocol";
import { CircleCheckIcon, CircleDashedIcon, PencilIcon, SparklesIcon } from "lucide-react";
import { Markdown } from "@/components/markdown.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { answerLabels } from "@/utils/question.ts";
import { anchors } from "@/utils/anchors.ts";
import { DiscussButton } from "./discuss-button.tsx";
import { DroppedQuestion } from "./dropped-question.tsx";

type Props = {
  question: Question;
  discussing: boolean;
  unread: number;
  onDiscuss: () => void;
  /** Show the question on its own page, where it is answered or changed. */
  onOpen: () => void;
};

/** One line of a round's review. Read only: answering and changing happen on the question's page. */
export function QuestionRow({ question, discussing, unread, onDiscuss, onOpen }: Props) {
  if (question.status === "dropped") return <DroppedQuestion question={question} />;

  const answer = question.answer;
  const labels = answerLabels(question);
  const open = question.status === "open";
  const sent = !!answer?.sent;
  const status = open ? "Not answered yet" : sent ? "Sent to Claude" : "Locked in, not sent yet";

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
            className={cn("mt-0.5 shrink-0", open ? "text-muted-foreground" : "text-success")}
            aria-label={status}
          >
            {open ? (
              <CircleDashedIcon className="size-5" />
            ) : sent ? (
              <CircleCheckIcon className="size-5 fill-success text-background" />
            ) : (
              <CircleCheckIcon className="size-5" />
            )}
          </TooltipTrigger>
          <TooltipContent>{status}</TooltipContent>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{question.id}</span>
            <h3 className="text-sm font-medium text-muted-foreground">{question.title}</h3>
          </div>
          {open && <p className="mt-1 text-sm text-muted-foreground italic">Not answered yet</p>}
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
          <Button variant="ghost" size="sm" onClick={onOpen}>
            {!open && <PencilIcon data-icon="inline-start" />}
            {open ? "Answer" : "Change"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
