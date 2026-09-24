import { useCallback, useEffect, useState } from "react";
import type { Question } from "@better-grill/protocol";

/**
 * Which view each question shows, answering or its visualization, remembered per question
 * for this tab. New questions open on answering. Also tracks which visualization versions
 * the user has looked at, so a page that arrives while they answer gets a dot.
 */
export function useVisualViews(onScreen: Question | undefined) {
  const [visual, setVisual] = useState<Record<string, boolean>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});

  const showing = useCallback((id: string) => !!visual[id], [visual]);
  const toggle = useCallback((id: string) => setVisual((current) => ({ ...current, [id]: !current[id] })), []);

  const viewedId = onScreen && visual[onScreen.id] ? onScreen.id : null;
  const viewedVersion = onScreen?.visualization?.version ?? 0;
  useEffect(() => {
    if (viewedId) setSeen((current) => (current[viewedId] === viewedVersion ? current : { ...current, [viewedId]: viewedVersion }));
  }, [viewedId, viewedVersion]);

  const unseen = useCallback((q: Question) => (q.visualization?.version ?? 0) > (seen[q.id] ?? 0), [seen]);

  return { showing, toggle, unseen };
}
