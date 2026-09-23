import type { SessionState } from "@better-grill/protocol";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import type { Connection } from "@/types/connection.ts";

type Tone = { label: string; dot: string; ping?: boolean };

function tone(state: SessionState, connection: Connection): Tone {
  if (state.ended) return { label: "Session closed", dot: "bg-muted-foreground/50" };
  if (connection.status === "reconnecting") return { label: "Reconnecting", dot: "bg-destructive", ping: true };
  if (state.claude === "listening") return { label: "Claude listening", dot: "bg-success", ping: true };
  return { label: "Claude thinking", dot: "bg-primary animate-pulse" };
}

export function StatusBadge({ state, connection }: { state: SessionState; connection: Connection }) {
  const { label, dot, ping } = tone(state, connection);
  return (
    <Badge variant="outline" className="h-6 gap-2 px-2.5 text-muted-foreground">
      <span className="relative flex size-2">
        {ping && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", dot)} />}
        <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </span>
      {label}
    </Badge>
  );
}
