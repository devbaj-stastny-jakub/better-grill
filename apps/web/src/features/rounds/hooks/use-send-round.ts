import type { SessionState } from "@better-grill/protocol";
import { useAction } from "@/hooks/use-action.ts";
import type { LockReason } from "@/lib/lock.ts";
import { liveQuestions } from "@/utils/question.ts";
import { sendRound } from "../api/send-round.ts";

/** What there is to send and whether it can go now. Shared by the send bar and the header button. */
export function useSendRound(state: SessionState, lock: LockReason) {
  const action = useAction(sendRound);
  const questions = liveQuestions(Object.values(state.questions));
  const open = questions.filter((q) => q.status === "open");
  const unsent = questions.filter((q) => q.status === "answered" && !q.answer?.sent);
  const changes = unsent.filter((q) => q.round < (state.rounds.at(-1)?.number ?? 0)).length;
  const ready = !state.ended && open.length === 0 && unsent.length > 0 && !lock && !action.pending;
  /** Nothing open and nothing unsent: the bar has nothing to say. */
  const idle = open.length === 0 && unsent.length === 0;
  return { open, unsent, changes, ready, idle, action, send: () => void action.run() };
}
