import { FireExtinguisherIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useAction } from "@/hooks/use-action.ts";
import { endSession } from "../api/end-session.ts";

type Props = {
  open: boolean;
  unsent: number;
  openCount: number;
  onCancel: () => void;
  onEnded: () => void;
};

/** Confirm before ending: it tells Claude to wrap up and cannot be undone. */
export function EndSessionDialog({ open, unsent, openCount, onCancel, onEnded }: Props) {
  const endAction = useAction(endSession);
  const ending = endAction.pending;

  const end = async () => {
    if (await endAction.run()) onEnded();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !ending) onCancel();
      }}
      onOpenChangeComplete={(next) => {
        if (next) endAction.clearError();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <FireExtinguisherIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Stop the grill here?</AlertDialogTitle>
          <AlertDialogDescription>
            Claude gets everything you have locked in and wraps up in the terminal. This tab closes itself afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {(unsent > 0 || openCount > 0) && (
          <ul className="space-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            {unsent > 0 && (
              <li>
                <span className="font-medium text-foreground tabular-nums">{unsent}</span> locked-in{" "}
                {unsent === 1 ? "answer" : "answers"} not sent yet, will be sent
              </li>
            )}
            {openCount > 0 && (
              <li>
                <span className="font-medium text-foreground tabular-nums">{openCount}</span>{" "}
                {openCount === 1 ? "question" : "questions"} still open, will stay unanswered
              </li>
            )}
          </ul>
        )}
        {endAction.error && (
          <div className="space-y-2">
            <ErrorNote message={endAction.error} onRetry={() => void end()} />
            <p className="text-sm text-muted-foreground">
              If the bridge is gone, there is nothing left to end.{" "}
              <Button variant="link" className="h-auto p-0" onClick={onEnded}>
                Close this tab anyway
              </Button>
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={ending}>Keep grilling</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={ending} onClick={() => void end()}>
            <PendingLabel pending={ending} pendingLabel="Ending…" label="End session" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
