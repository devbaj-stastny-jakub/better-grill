import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useNow } from "@/hooks/use-now.ts";
import type { LockReason } from "@/lib/lock.ts";
import { formatElapsed } from "@/utils/format.ts";

/** Shown between Send and Claude's next round, so the round never just vanishes. */
export function ClaudeWorking({ since, lock }: { since: number; lock: LockReason }) {
  const now = useNow();
  const elapsedMs = now - since;

  return (
    <Card className="mb-12 animate-in fade-in-0 slide-in-from-bottom-2 animation-duration-300">
      <CardContent className="flex items-start gap-4 px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Spinner className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Sent. Claude is working through your answers.</p>
            <Badge variant="outline" className="text-muted-foreground tabular-nums">
              {formatElapsed(elapsedMs)}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">The next round or the summary lands here.</p>
          {lock === "offline" && (
            <LockedNote className="mt-2 text-destructive">Bridge unreachable. The next round shows up once it reconnects.</LockedNote>
          )}
          {!lock && elapsedMs >= 120_000 && (
            <LockedNote className="mt-2">
              Taking a while. Claude may be researching facts with sub-agents. The terminal shows what it is doing.
            </LockedNote>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
