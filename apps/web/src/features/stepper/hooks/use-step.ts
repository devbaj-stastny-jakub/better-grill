import { useCallback, useState } from "react";
import type { SessionState } from "@better-grill/protocol";
import { anchors } from "@/utils/anchors.ts";
import { defaultStep, listSteps, roundStart, stepAfterLockIn } from "../utils/steps.ts";

type Seen = { rounds: number; summary: boolean } | null;

/**
 * The step on screen. Pinned on load, then moved by the user, by locking in an
 * answer, and by Claude posting a new round or the summary.
 */
export function useStep(state: SessionState | null) {
  const [picked, setPicked] = useState<string | null>(null);
  const [seen, setSeen] = useState<Seen>(null);
  const steps = state ? listSteps(state) : [];

  // Follow the conversation. Adjusted during render so the new step shows in the same frame.
  const rounds = state?.rounds.length ?? 0;
  const summary = !!state?.summary;
  if (state && (seen?.rounds !== rounds || seen.summary !== summary)) {
    setSeen({ rounds, summary });
    const target = !seen
      ? defaultStep(state, steps)
      : summary && !seen.summary
        ? steps.find((s) => s.key === anchors.summary)
        : rounds > seen.rounds
          ? roundStart(state, steps, rounds)
          : undefined;
    if (target) setPicked(target.key);
  }

  const current = steps.find((s) => s.key === picked) ?? (state ? defaultStep(state, steps) : undefined);

  // Carry on from a locked-in question, unless the user already moved elsewhere.
  const lockedIn = useCallback(
    (id: string) => {
      if (!state) return;
      const next = stepAfterLockIn(state, listSteps(state), id);
      setPicked((now) => (next && (now === null || now === anchors.question(id)) ? next.key : now));
    },
    [state],
  );

  return { current, go: setPicked, lockedIn };
}
