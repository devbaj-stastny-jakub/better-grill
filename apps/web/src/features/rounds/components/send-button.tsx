import type { SessionState } from "@better-grill/protocol";
import { CircleDashedIcon, SendIcon } from "lucide-react";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { anchors } from "@/utils/anchors.ts";
import { useSendRound } from "../hooks/use-send-round.ts";

type Props = { state: SessionState; lock: LockReason; onJump: (anchor: string) => void };

/** Compact send for the header: "2 open" jumps to the next open question, "Send 3" sends. */
export function SendButton({ state, lock, onJump }: Props) {
  const { open, unsent, ready, idle, action, send } = useSendRound(state, lock);
  if (state.ended || idle) return null;

  const first = open[0];
  const hint = action.error ?? (lock ? LOCK_COPY[lock] : first ? `Next open: ${first.id}` : `${unsent.length} locked in, ready to send`);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          first ? (
            <Button variant="outline" size="sm" onClick={() => onJump(anchors.question(first.id))} />
          ) : (
            <Button
              size="sm"
              disabled={!ready}
              onClick={send}
              className={cn(action.error && "ring-2 ring-destructive/50")}
            />
          )
        }
      >
        {first ? (
          <>
            <CircleDashedIcon data-icon="inline-start" className="text-primary" />
            <span className="tabular-nums">{open.length}</span> open
          </>
        ) : (
          <>
            {!action.pending && <SendIcon data-icon="inline-start" />}
            <PendingLabel pending={action.pending} pendingLabel="Sending…" label={`Send ${unsent.length}`} />
          </>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">{hint}</TooltipContent>
    </Tooltip>
  );
}
