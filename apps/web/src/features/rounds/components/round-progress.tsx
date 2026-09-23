import type { Question } from "@better-grill/protocol";
import { SendIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { liveQuestions } from "@/utils/question.ts";

export function RoundProgress({ questions }: { questions: Question[] }) {
  const live = liveQuestions(questions);
  const locked = live.filter((q) => q.status === "answered");
  if (live.length === 0) return null;
  const sent = locked.length === live.length && locked.every((q) => q.answer?.sent);
  if (sent) {
    return (
      <Badge variant="secondary" className="bg-success/10 text-success">
        <SendIcon data-icon="inline-start" />
        Sent to Claude
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground tabular-nums">
      <span>
        <span className="text-foreground">{locked.length}</span>/{live.length} locked in
      </span>
    </Badge>
  );
}
