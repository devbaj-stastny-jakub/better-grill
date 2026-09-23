import type { Question, SessionState } from "@better-grill/protocol";

/** Questions Claude has not dropped. */
export function liveQuestions(questions: Iterable<Question>) {
  return [...questions].filter((q) => q.status !== "dropped");
}

export function roundQuestions(state: SessionState, questionIds: string[]) {
  return questionIds.flatMap((id) => state.questions[id] ?? []);
}

export function answerLabels(question: Question) {
  return question.options.filter((o) => question.answer?.optionIds.includes(o.id)).map((o) => o.label);
}

/** One-line answer: picked labels, then the text with markdown marks stripped. */
export function answerPreview(question: Question) {
  const text = question.answer?.text?.replace(/[*_`#>]/g, "");
  return [answerLabels(question).join(" + "), text].filter(Boolean).join(" — ");
}

export function countClaudeReplies(question: Question) {
  return question.chat.filter((m) => m.role === "claude").length;
}

/** The user wrote last, so Claude owes a reply. */
export function awaitingClaude(question: Question) {
  return question.chat.at(-1)?.role === "user";
}
