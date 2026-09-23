import { useEffect, useRef } from "react";
import type { SessionState } from "@better-grill/protocol";
import { CircleDashedIcon, SendIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useAction } from "@/hooks/use-action.ts";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { liveQuestions } from "@/utils/question.ts";
import { anchors } from "@/utils/anchors.ts";
import { sendRound } from "../api/send-round.ts";
import { ClaudeWorking } from "./claude-working.tsx";

type Props = {
  state: SessionState;
  lock: LockReason;
  /** Show a step, by its anchor id. */
  onJump: (anchor: string) => void;
};

/** Answers wait in the bridge until the user sends them. Needs every question answered. */
export function SendBar({ state, lock, onJump }: Props) {
  const sendAction = useAction(sendRound);
  const sending = sendAction.pending;
  const button = useRef<HTMLButtonElement>(null);

  const questions = liveQuestions(Object.values(state.questions));
  const open = questions.filter((q) => q.status === "open");
  const unsent = questions.filter((q) => q.status === "answered" && !q.answer?.sent);
  const ready = !state.ended && open.length === 0 && unsent.length > 0 && !lock && !sending;

  // Last question just locked in by keyboard and focus fell to the page: hand it to Send, so Enter sends.
  useEffect(() => {
    if (ready && document.activeElement === document.body) button.current?.focus({ preventScroll: true });
  }, [ready]);

  if (state.ended) return null;
  if (open.length === 0 && unsent.length === 0) {
    return state.awaitingSince ? <ClaudeWorking since={state.awaitingSince} lock={lock} /> : null;
  }

  const changes = unsent.filter((q) => q.round < (state.rounds.at(-1)?.number ?? 0)).length;
  const send = () => void sendAction.run();

  return (
    <div className="sticky bottom-4 z-20 mb-12">
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
          {sendAction.error && (
            <ErrorNote className="mt-2" message={sendAction.error} onRetry={send} onDismiss={sendAction.clearError} />
          )}
        </div>
        <Button ref={button} size="lg" disabled={!ready} onClick={send} className="px-4">
          {!sending && <SendIcon data-icon="inline-start" />}
          <PendingLabel pending={sending} pendingLabel="Sending…" label="Send to Claude" />
        </Button>
      </div>
    </div>
  );
}
