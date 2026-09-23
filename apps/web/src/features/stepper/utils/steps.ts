import type { SessionState } from "@better-grill/protocol";
import { anchors } from "@/utils/anchors.ts";

/*
 * The page shows one step at a time: each question of a round, then that
 * round's review, then the summary once Claude posts it. Steps change by
 * locking in an answer, from the sidebar and the send bar, and as Claude
 * posts. A step's key is its anchor id, so the sidebar and the send bar can
 * name steps without knowing about the stepper.
 */
export type QuestionStep = { key: string; kind: "question"; id: string; round: number };
export type Step = QuestionStep | { key: string; kind: "review"; round: number } | { key: string; kind: "summary" };

export function listSteps(state: SessionState): Step[] {
  const steps: Step[] = state.rounds.flatMap((round) => [
    ...round.questionIds
      .filter((id) => state.questions[id])
      .map((id): Step => ({ key: anchors.question(id), kind: "question", id, round: round.number })),
    { key: anchors.round(round.number), kind: "review", round: round.number } as const,
  ]);
  if (state.summary) steps.push({ key: anchors.summary, kind: "summary" });
  return steps;
}

const isQuestion = (step: Step): step is QuestionStep => step.kind === "question";
const isOpen = (state: SessionState) => (step: QuestionStep) => state.questions[step.id]?.status === "open";

/** Where to land on load: the first open question, else the summary, else the last round's review. */
export function defaultStep(state: SessionState, steps: Step[]) {
  return steps.filter(isQuestion).find(isOpen(state)) ?? steps.find((s) => s.kind === "summary") ?? steps.at(-1);
}

/** A round just arrived: its first open question, else its review. */
export function roundStart(state: SessionState, steps: Step[], round: number) {
  const inRound = steps.filter((s) => s.kind !== "summary" && s.round === round);
  return inRound.filter(isQuestion).find(isOpen(state)) ?? inRound.find((s) => s.kind === "review");
}

/** After locking in `id`: the next open question (wrapping around), else the review of its round. */
export function stepAfterLockIn(state: SessionState, steps: Step[], id: string) {
  const questions = steps.filter(isQuestion);
  const at = questions.findIndex((s) => s.id === id);
  const others = [...questions.slice(at + 1), ...questions.slice(0, Math.max(at, 0))];
  const round = questions[at]?.round;
  return others.find(isOpen(state)) ?? steps.find((s) => s.kind === "review" && s.round === round);
}
