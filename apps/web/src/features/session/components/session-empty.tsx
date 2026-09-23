import type { SessionState } from "@better-grill/protocol";
import { InboxIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { WarmUp } from "./warm-up.tsx";

/** Before Claude posts the first round. Centred like the loading screen's, so the grill stays put. */
export function WaitingForRound({ state }: { state: SessionState }) {
  return <WarmUp stage="reading" session={state.startedAt} />;
}

/** The session ended with no rounds at all. */
export function EndedEmpty() {
  return (
    <Empty className="animate-in fade-in-0 animation-duration-500">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-10">
          <InboxIcon className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-base">No questions this time</EmptyTitle>
        <EmptyDescription>
          Run <code className="font-mono whitespace-nowrap text-foreground">/better-grill</code> to start again.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
