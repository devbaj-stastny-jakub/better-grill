import type { ReactNode } from "react";
import type { Question } from "@better-grill/protocol";
import type { LockReason } from "@/lib/lock.ts";
import { DroppedQuestion } from "./dropped-question.tsx";
import { QuestionEditor } from "./question-editor.tsx";

type Props = {
  question: Question;
  lock: LockReason;
  discussing: boolean;
  unread: number;
  onDiscuss: () => void;
  /** An answer was locked in from this card. */
  onLockedIn: () => void;
  /** Where the question's floating action bar goes: the end of the page. */
  actionsSlot?: HTMLElement | null;
  /** Extra controls next to Discuss in the action bar. */
  extraActions?: ReactNode;
  /** Kept mounted behind another view: its shortcuts stay off. */
  hidden?: boolean;
};

/** The question on its own page: dropped, or open for answering and changing the answer. */
export function QuestionCard(props: Props) {
  const { question } = props;
  if (question.status === "dropped") return <DroppedQuestion question={question} />;
  // Remount on a fresh answer (Claude may resolve it in the discussion) so the editor shows it.
  return <QuestionEditor key={question.answer?.at ?? "open"} {...props} />;
}
