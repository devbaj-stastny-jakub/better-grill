import { useEffect, useRef } from "react";
import type { SessionState } from "@better-grill/protocol";
import { CircleDashedIcon, SendIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { anchors } from "@/utils/anchors.ts";
import { useSendRound } from "../hooks/use-send-round.ts";
import { ClaudeWorking } from "./claude-working.tsx";

type Props = {
  state: SessionState;
  lock: LockReason;
  /** Show a step, by its anchor id. */
  onJump: (anchor: string) => void;
  /** The send card itself (a round's review); off leaves only the Claude-is-working card. */
  showBar: boolean;
};

/**
 * Answers wait in the bridge until the user sends them; needs every question answered.
 * Sits at the end of a round's review (the header's SendButton works from anywhere).
 * Between Send and the next round it shows that Claude is working, on any step.
 */
export function SendBar({ state, lock, onJump, showBar }: Props) {
  const { open, unsent, changes, ready, idle, action, send } = useSendRound(state, lock);
  const sending = action.pending;
  const button = useRef<HTMLButtonElement>(null);

  // Last question just locked in by keyboard and focus fell to the page: hand it to Send, so Enter sends.
  useEffect(() => {
    if (ready && document.activeElement === document.body) button.current?.focus({ preventScroll: true });
  }, [ready]);

  if (state.ended) return null;
  if (idle) return state.awaitingSince ? <ClaudeWorking since={state.awaitingSince} lock={lock} /> : null;
  if (!showBar) return null;

  return (
    <div className="mb-12">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-popover/95 px-4 py-3 shadow-lg backdrop-blur-md transition-[border-color,box-shadow] sm:px-5",
          ready && "border-primary/50 shadow-primary/15 ring-4 ring-primary/10",
        )}
      >
        <div className="min-w-0 flex-1">
          {open.length > 0 ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium">
                <CircleDashedIcon className="size-4 text-primary" />
                <span className="tabular-nums">{open.length}</span> still open
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {open.map((q) => (
                  <Badge
                    key={q.id}
                    variant="outline"
                    className="font-mono text-muted-foreground hover:bg-muted hover:text-foreground"
                    render={<button type="button" onClick={() => onJump(anchors.question(q.id))} />}
                  >
                    {q.id}
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">All locked in.</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unsent.length} {unsent.length === 1 ? "answer" : "answers"}
                {changes > 0 && ` · ${changes} changed from earlier rounds`} · you can still change anything
              </p>
            </>
          )}
          {lock && <LockedNote className="mt-1.5">{LOCK_COPY[lock]}</LockedNote>}
          {action.error && <ErrorNote className="mt-2" message={action.error} onRetry={send} onDismiss={action.clearError} />}
        </div>
        <Button ref={button} size="lg" disabled={!ready} onClick={send} className="px-4">
          {!sending && <SendIcon data-icon="inline-start" />}
          <PendingLabel pending={sending} pendingLabel="Sending…" label="Send to Claude" />
        </Button>
      </div>
    </div>
  );
}
