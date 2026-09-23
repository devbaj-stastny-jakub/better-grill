import type { Question, Round } from "@better-grill/protocol";
import type { ReactNode } from "react";
import { roundLabel } from "@/utils/format.ts";
import { anchors } from "@/utils/scroll.ts";
import { RoundProgress } from "./round-progress.tsx";

type Props = { round: Round; questions: Question[]; children: ReactNode };

export function RoundSection({ round, questions, children }: Props) {
  return (
    <section id={anchors.round(round.number)} className="mb-12 scroll-mt-20">
      <div className="mb-4 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Round {roundLabel(round.number)}</p>
          <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-tight">{round.title ?? `Round ${round.number}`}</h2>
        </div>
        <RoundProgress questions={questions} />
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
