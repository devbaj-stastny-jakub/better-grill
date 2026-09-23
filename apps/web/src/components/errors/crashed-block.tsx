import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";

/** Fallback for a single crashed card or panel. */
export function CrashedBlock({ what, error, onReset }: { what: string; error: Error; onReset: () => void }) {
  return (
    <Alert variant="destructive" className="border-dashed border-destructive/40 px-4 py-3">
      <TriangleAlertIcon />
      <AlertTitle>{what} failed to render</AlertTitle>
      <AlertDescription>
        <p>This part of the page hit a bug. The rest keeps working, and nothing was lost in the bridge.</p>
        <p className="truncate font-mono text-xs" title={error.message}>
          {error.message}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onReset}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
