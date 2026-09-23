import { useEffect, useState } from "react";
import type { SessionState } from "@better-grill/protocol";
import { anchors } from "@/utils/scroll.ts";

/** The question card nearest the top of the viewport, for the "you are here" marker. */
export function useQuestionInView(state: SessionState) {
  const [current, setCurrent] = useState<string | null>(null);
  const ids = state.rounds.flatMap((r) => r.questionIds).join(",");

  useEffect(() => {
    const visible = new Map<string, number>();
    const byElement = new Map<Element, string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = byElement.get(entry.target);
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        setCurrent(top ? top[0] : null);
      },
      // Ignore the sticky header and the lower part of the screen.
      { rootMargin: "-56px 0px -45% 0px" },
    );
    for (const id of ids.split(",")) {
      const element = id && document.getElementById(anchors.question(id));
      if (!element) continue;
      byElement.set(element, id);
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ids]);

  return current;
}
