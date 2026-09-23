import { RotateCwIcon, UnplugIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import type { Connection } from "@/types/connection.ts";

/** The bridge never answered. Most likely the session is gone. */
export function UnreachableScreen({ connection }: { connection: Connection }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4">
      <Empty className="animate-in fade-in-0 animation-duration-300">
        <EmptyHeader>
          <EmptyMedia className="size-10 rounded-lg bg-destructive/10 text-destructive">
            <UnplugIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-base">Can't reach this session</EmptyTitle>
          <EmptyDescription>
            It has probably ended. Run <code className="font-mono whitespace-nowrap text-foreground">/better-grill</code> to start a new one.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.location.reload()}>
            <RotateCwIcon data-icon="inline-start" />
            Retry
          </Button>
          <p className="text-xs text-muted-foreground">Retrying automatically · attempt {connection.attempts}</p>
        </EmptyContent>
      </Empty>
    </div>
  );
}
