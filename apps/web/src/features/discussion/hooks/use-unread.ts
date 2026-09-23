import { useCallback, useEffect, useState } from "react";
import type { Question } from "@better-grill/protocol";
import { countClaudeReplies } from "@/utils/question.ts";

/** Claude replies per question the user has not seen. An open thread counts as read. */
export function useUnread(openQuestion: Question | undefined) {
  const [seen, setSeen] = useState<Record<string, number>>({});
  const openId = openQuestion?.id;
  const openReplies = openQuestion ? countClaudeReplies(openQuestion) : 0;

  useEffect(() => {
    if (openId) setSeen((current) => ({ ...current, [openId]: openReplies }));
  }, [openId, openReplies]);

  return useCallback((q: Question) => countClaudeReplies(q) - (seen[q.id] ?? 0), [seen]);
}
