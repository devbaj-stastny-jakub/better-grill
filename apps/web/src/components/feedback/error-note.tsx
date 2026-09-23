import { CircleAlertIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

/** Inline error from a bridge call, with optional retry and dismiss. */
export function ErrorNote({
  message,
  onRetry,
  onDismiss,
  className,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={cn("flex items-start gap-2 border-destructive/30 bg-destructive/5", className)}>
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <AlertDescription className="min-w-0 flex-1 text-destructive">{message}</AlertDescription>
      {onRetry && (
        <Button variant="ghost" size="xs" onClick={onRetry} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          Retry
        </Button>
      )}
      {onDismiss && (
        <Button variant="ghost" size="icon-xs" onClick={onDismiss} aria-label="Dismiss" className="text-muted-foreground">
          <XIcon />
        </Button>
      )}
    </Alert>
  );
}
