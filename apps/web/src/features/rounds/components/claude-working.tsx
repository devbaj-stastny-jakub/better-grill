import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useNow } from "@/hooks/use-now.ts";
import type { LockReason } from "@/lib/lock.ts";
import { formatElapsed } from "@/utils/format.ts";

/**
 * Shown between Send and Claude's next round, so the round never just vanishes. One log line
 * in a dashed slot where the next round lands, in the warm-up's style.
 */
export function ClaudeWorking({ since, lock }: { since: number; lock: LockReason }) {
  const now = useNow();
  const elapsedMs = now - since;

  return (
    <div role="status" aria-live="polite" className="mb-12 animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 font-mono text-xs">
        <Spinner className="size-4 text-primary" />
        <span className="min-w-0 flex-1 text-foreground">
          Claude is working through your answers
          <span className="ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-primary motion-safe:animate-blink" />
        </span>
        <span className="shrink-0 text-muted-foreground tabular-nums">{formatElapsed(elapsedMs)}</span>
      </div>
      {lock === "offline" && (
        <LockedNote className="mt-2 px-1 text-destructive">Bridge unreachable. The next round shows up once it reconnects.</LockedNote>
      )}
      {!lock && elapsedMs >= 120_000 && (
        <LockedNote className="mt-2 px-1">
          Taking a while. Claude may be researching facts with sub-agents. The terminal shows what it is doing.
        </LockedNote>
      )}
    </div>
  );
}
