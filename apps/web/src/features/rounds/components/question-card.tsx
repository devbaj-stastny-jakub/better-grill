import { useEffect, useState } from "react";
import type { Question } from "@better-grill/protocol";
import type { LockReason } from "@/lib/lock.ts";
import { AnsweredQuestion } from "./answered-question.tsx";
import { DroppedQuestion } from "./dropped-question.tsx";
import { QuestionEditor } from "./question-editor.tsx";

type Props = {
  question: Question;
  lock: LockReason;
  discussing: boolean;
  unread: number;
  onDiscuss: () => void;
};

/** One question in a round: dropped, answered (collapsed), or open for answering. */
export function QuestionCard(props: Props) {
  const { question } = props;
  const [editing, setEditing] = useState(question.status === "open");
  // Opened with "Change": take focus so the keyboard can carry on from there.
  const [focusOnOpen, setFocusOnOpen] = useState(false);

  // A fresh answer from the bridge closes the editor.
  const answeredAt = question.answer?.at;
  useEffect(() => {
    if (answeredAt) setEditing(false);
  }, [answeredAt]);

  if (question.status === "dropped") return <DroppedQuestion question={question} />;
  if (question.status === "answered" && !editing) {
    return (
      <AnsweredQuestion
        {...props}
        onChange={() => {
          setEditing(true);
          setFocusOnOpen(true);
        }}
      />
    );
  }
  return <QuestionEditor {...props} focusOnOpen={focusOnOpen} onCancel={() => setEditing(false)} />;
}
