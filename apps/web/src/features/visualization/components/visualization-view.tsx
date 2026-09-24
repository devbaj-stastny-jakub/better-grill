import { type ReactNode, useState } from "react";
import type { Question } from "@better-grill/protocol";
import { CircleAlertIcon, ShapesIcon, TriangleAlertIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { FloatingActions } from "@/components/floating-actions.tsx";
import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useAction } from "@/hooks/use-action.ts";
import { useNow } from "@/hooks/use-now.ts";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { formatElapsed } from "@/utils/format.ts";
import { requestVisualization } from "../api/request-visualization.ts";
import { useVisualizationPage } from "../api/use-visualization-page.ts";
import { VisualizationFrame } from "./visualization-frame.tsx";

type Props = {
  question: Question;
  lock: LockReason;
  /** Where the floating action bar goes, as on the answering view. */
  actionsSlot?: HTMLElement | null;
  /** Discuss and the switch back, left in the action bar. */
  actions: ReactNode;
};

/** A question's visualization view: ask Claude for one, watch it arrive, regenerate it. */
export function VisualizationView({ question, lock, actionsSlot, actions }: Props) {
  const visualization = question.visualization;
  const version = visualization?.version ?? 0;
  const working = visualization?.status === "pending";
  const page = useVisualizationPage(question.id, version);
  // Claude rewrote the question after this page arrived.
  const stale = !!visualization?.readyAt && !!question.editedAt && question.editedAt > visualization.readyAt;

  const view = (
    <Card className="relative gap-5 pt-5 shadow-xs">
      <CardHeader className="grid-cols-1 gap-2 px-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="font-mono">{question.id}</Badge>
          <span className="text-xs text-muted-foreground">Visualization</span>
          {working && version > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Spinner data-icon="inline-start" />
              Regenerating
            </Badge>
          )}
          {stale && (
            <Badge variant="secondary">
              <TriangleAlertIcon data-icon="inline-start" />
              Made before Claude's last edit
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-balance">{question.title}</CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-4 px-5 sm:px-6">
        {version > 0 ? (
          page.html !== null ? (
            <VisualizationFrame html={page.html} title={`Visualization of ${question.id}: ${question.title}`} />
          ) : page.error ? (
            <ErrorNote message={page.error} onRetry={page.retry} />
          ) : (
            <div className="grid h-48 place-items-center">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          )
        ) : working ? (
          <Working since={visualization.requestedAt} note={visualization.note} lock={lock} />
        ) : visualization?.status === "failed" ? null : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShapesIcon />
              </EmptyMedia>
              <EmptyTitle>No visualization yet</EmptyTitle>
              <EmptyDescription>
                Claude visualizes the question right here, so it's easier to understand. It takes a minute or two, and
                you can keep answering meanwhile.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-md">
              <VisualizeForm question={question} lock={lock} label="Visualize" />
            </EmptyContent>
          </Empty>
        )}

        {visualization?.status === "failed" && (
          <Alert>
            <CircleAlertIcon />
            <AlertTitle>No visualization for this one</AlertTitle>
            <AlertDescription>{visualization.reason}</AlertDescription>
          </Alert>
        )}

        {(version > 0 || visualization?.status === "failed") && !working && (
          <VisualizeForm
            question={question}
            lock={lock}
            label={version > 0 ? "Regenerate" : "Try again"}
            className="border-t pt-4"
          />
        )}
      </CardContent>
    </Card>
  );

  if (!actionsSlot) return view;
  return (
    <>
      {view}
      <FloatingActions slot={actionsSlot}>
        {actions}
        <div className="flex-1" />
        {lock && <LockedNote>{LOCK_COPY[lock]}</LockedNote>}
      </FloatingActions>
    </>
  );
}

/** Claude has the request and hasn't posted a page yet. */
function Working({ since, note, lock }: { since: number; note?: string; lock: LockReason }) {
  const now = useNow();
  return (
    <div role="status" aria-live="polite" className="grid gap-2">
      <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 font-mono text-xs">
        <Spinner className="size-4 text-primary" />
        <span className="min-w-0 flex-1 text-foreground">
          Claude is visualizing this question
          <span className="ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-primary motion-safe:animate-blink" />
        </span>
        <span className="shrink-0 text-muted-foreground tabular-nums">{formatElapsed(now - since)}</span>
      </div>
      {note && <p className="px-1 text-xs text-muted-foreground">You asked: {note}</p>}
      {lock === "offline" && (
        <LockedNote className="px-1 text-destructive">Bridge unreachable. The visualization shows up once it reconnects.</LockedNote>
      )}
    </div>
  );
}

/** An optional note on what to show, and the button that asks Claude: side by side, wrapping on a phone. */
function VisualizeForm({
  question,
  lock,
  label,
  className,
}: {
  question: Question;
  lock: LockReason;
  label: string;
  className?: string;
}) {
  const [note, setNote] = useState("");
  const action = useAction(requestVisualization);
  const disabled = !!lock || action.pending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    if (await action.run(question.id, { note: note.trim() || undefined })) setNote("");
  };

  return (
    <form onSubmit={(event) => void submit(event)} className={cn("grid w-full gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        <Input
          value={note}
          onChange={(event) => {
            action.clearError();
            setNote(event.target.value);
          }}
          disabled={disabled}
          maxLength={2000}
          aria-label="What the visualization should show"
          placeholder={label === "Regenerate" ? "What should change? (optional)" : "What to focus on (optional)"}
          className="min-w-48 flex-1"
        />
        <Button type="submit" variant={label === "Visualize" ? "default" : "outline"} disabled={disabled}>
          <PendingLabel pending={action.pending} label={label} pendingLabel="Asking…" />
        </Button>
      </div>
      {action.error && <ErrorNote message={action.error} onDismiss={action.clearError} />}
    </form>
  );
}
