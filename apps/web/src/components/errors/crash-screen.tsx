import { RotateCwIcon } from "lucide-react";
import { Brand } from "@/components/brand.tsx";
import { Button } from "@/components/ui/button.tsx";

/** Whole-app crash fallback. The bridge still holds every answer. */
export function CrashScreen({ error }: { error: Error }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <Brand />
        <p className="mt-10 text-sm font-medium text-destructive">UI error</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">The page crashed.</h1>
        <p className="mt-3 text-muted-foreground">
          Nothing is lost: your answers and discussions live in the bridge, not in this tab. Reloading picks them up again.
        </p>
        <pre className="mt-5 max-h-32 overflow-auto rounded-lg border bg-muted px-4 py-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {error.message}
        </pre>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          <RotateCwIcon data-icon="inline-start" />
          Reload
        </Button>
      </div>
    </div>
  );
}
