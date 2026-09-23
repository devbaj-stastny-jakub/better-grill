import type { SessionState } from "@better-grill/protocol";
import { InboxIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

/** Before Claude posts the first round. */
export function WaitingForRound({ claude }: { claude: SessionState["claude"] }) {
  return (
    <Empty className="mt-24 animate-in fade-in-0 animation-duration-500">
      <EmptyHeader>
        <EmptyMedia className="size-10 rounded-lg bg-primary/10 text-primary">
          <Spinner className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-base">Waiting for the first round</EmptyTitle>
        <EmptyDescription>{claude === "listening" ? "Claude is about to post." : "Claude is reading your request."}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** The session ended with no rounds at all. */
export function EndedEmpty() {
  return (
    <Empty className="mt-24 animate-in fade-in-0 animation-duration-500">
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
