import type { Question } from "@better-grill/protocol";
import { Badge } from "@/components/ui/badge.tsx";
import { anchors } from "@/utils/anchors.ts";

export function DroppedQuestion({ question }: { question: Question }) {
  return (
    <article
      id={anchors.question(question.id)}
      className="scroll-mt-20 rounded-xl border border-dashed px-5 py-4 text-muted-foreground"
    >
      <div className="flex items-center gap-2.5">
        <Badge variant="outline" className="font-mono text-muted-foreground">
          {question.id}
        </Badge>
        <span className="text-sm font-medium line-through decoration-muted-foreground/60">{question.title}</span>
        <Badge variant="ghost" className="ml-auto">
          Dropped
        </Badge>
      </div>
      {question.dropReason && <p className="mt-2 text-sm italic">{question.dropReason}</p>}
    </article>
  );
}
