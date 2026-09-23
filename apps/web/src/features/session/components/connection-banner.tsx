import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SessionState } from "@better-grill/protocol";
import { CheckIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";
import type { Connection } from "@/types/connection.ts";

/** Sticky strip under the header for connection trouble, recovery and session end. */
export function ConnectionBanner({ state, connection }: { state: SessionState; connection: Connection }) {
  const [recovered, setRecovered] = useState(false);
  const previous = useRef(connection.status);

  useEffect(() => {
    const was = previous.current;
    previous.current = connection.status;
    if (was === "reconnecting" && connection.status === "open") {
      setRecovered(true);
      const timer = setTimeout(() => setRecovered(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [connection.status]);

  if (state.ended) {
    const confirmed = state.summary?.status === "confirmed";
    return (
      <Strip tone="muted">
        <InfoIcon className="size-3.5" />
        {confirmed ? "Summary confirmed. Claude takes it from here in the terminal." : "Session closed. Back to your terminal."}
      </Strip>
    );
  }
  if (connection.status === "reconnecting") {
    const longGone = connection.attempts >= 6;
    return (
      <Strip tone="alert">
        <Spinner className="size-3.5" />
        <span>
          {longGone ? (
            <>
              The bridge has been gone for a while. If its Claude Code session was closed, run{" "}
              <code className="font-mono font-medium">/better-grill</code> again. Still retrying.
            </>
          ) : (
            <>
              Lost the bridge. Reconnecting{connection.attempts > 1 ? ` (attempt ${connection.attempts})` : ""}… Everything
              you locked in is kept in the bridge.
            </>
          )}
        </span>
        <Button variant="link" size="xs" className="h-auto px-0 text-current" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </Strip>
    );
  }
  if (recovered) {
    return (
      <Strip tone="ok">
        <CheckIcon className="size-3.5" />
        Reconnected. You're up to date.
      </Strip>
    );
  }
  return null;
}

const TONES = {
  muted: "bg-muted/80 text-muted-foreground",
  alert: "bg-destructive/10 text-destructive",
  ok: "bg-success/10 text-success",
};

function Strip({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <div
      role={tone === "alert" ? "alert" : "status"}
      className={cn(
        "sticky top-14 z-20 flex items-center justify-center gap-2 border-b px-4 py-2 text-center text-xs font-medium backdrop-blur-md animate-in fade-in-0 slide-in-from-top-1",
        TONES[tone],
      )}
    >
      {children}
    </div>
  );
}
