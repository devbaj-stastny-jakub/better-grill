import { useState } from "react";
import type { Summary } from "@better-grill/protocol";
import { CheckIcon, ClipboardCheckIcon, UndoIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import { Markdown } from "@/components/markdown.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useAction } from "@/hooks/use-action.ts";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { anchors } from "@/utils/scroll.ts";
import { respondSummary } from "../api/respond-summary.ts";

export function SummaryPanel({ summary, lock }: { summary: Summary; lock: LockReason }) {
  const [objecting, setObjecting] = useState(false);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<boolean | null>(null);
  const respondAction = useAction(respondSummary);
  const busy = respondAction.pending;

  const respond = async (confirmed: boolean) => {
    setChoice(confirmed);
    const ok = await respondAction.run(confirmed, confirmed ? undefined : text.trim() || undefined);
    if (ok) {
      setObjecting(false);
      setText("");
    }
  };

  const answerable = summary.status === "pending" && !lock;

  return (
    <Card
      id={anchors.summary}
      className="scroll-mt-20 gap-5 pt-5 ring-primary/30 animate-in fade-in-0 slide-in-from-bottom-2 animation-duration-500"
    >
      <CardHeader className="px-5 sm:px-6">
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardCheckIcon className="size-5" />
        </div>
        <CardDescription className="font-medium text-primary">Shared understanding?</CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight">Here is what we settled</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 px-5 sm:px-6">
        <Markdown className="text-sm">{summary.markdown}</Markdown>

        {summary.status === "confirmed" && (
          <Alert className="border-success/30 bg-success/5 text-success">
            <CheckIcon />
            <AlertDescription className="text-success">Confirmed. Claude takes it from here.</AlertDescription>
          </Alert>
        )}
        {summary.status === "rejected" && (
          <Alert>
            <UndoIcon />
            <AlertDescription>Sent back to Claude{summary.feedback ? `: “${summary.feedback}”` : "."}</AlertDescription>
          </Alert>
        )}
        {summary.status === "pending" && lock && <LockedNote>{LOCK_COPY[lock]} The summary can't be answered now.</LockedNote>}

        {answerable && objecting && (
          <Textarea
            value={text}
            disabled={busy}
            onChange={(e) => {
              respondAction.clearError();
              setText(e.target.value);
            }}
            autoFocus
            rows={3}
            placeholder="What is missing or wrong?"
          />
        )}
        {answerable && respondAction.error && (
          <ErrorNote
            message={respondAction.error}
            onRetry={choice === null ? undefined : () => void respond(choice)}
            onDismiss={respondAction.clearError}
          />
        )}
      </CardContent>

      {answerable && (
        <CardFooter className="flex-wrap gap-2 px-5 sm:px-6">
          {objecting ? (
            <>
              <Button disabled={busy || !text.trim()} onClick={() => void respond(false)}>
                <PendingLabel pending={busy} pendingLabel="Sending back…" label="Send back to Claude" />
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setObjecting(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button disabled={busy} onClick={() => void respond(true)}>
                {!busy && <CheckIcon data-icon="inline-start" />}
                <PendingLabel pending={busy} pendingLabel="Confirming…" label="Yes, that's it" />
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setObjecting(true)}>
                Not yet
              </Button>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
