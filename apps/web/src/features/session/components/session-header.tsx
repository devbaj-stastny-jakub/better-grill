import type { ReactNode } from "react";
import type { SessionState } from "@better-grill/protocol";
import { BookOpenTextIcon, FireExtinguisherIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

type Props = {
  state: SessionState;
  onEnd: () => void;
  /** Extra controls at the far right, composed by the app. */
  actions?: ReactNode;
};

export function SessionHeader({ state, onEnd, actions }: Props) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 rounded-xl border bg-background/80 px-3 shadow-md backdrop-blur-md supports-backdrop-filter:bg-background/60">
      {/* On desktop the toggle lives in the panel; on mobile the panel is a sheet, so this opens it. */}
      <SidebarTrigger className="md:hidden" />
      <Separator orientation="vertical" className="h-4 data-vertical:self-center md:hidden" />
      <h1 className="min-w-0 truncate text-sm font-medium">{state.title}</h1>
      {state.mode === "docs" && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge variant="outline" className="hidden text-muted-foreground sm:inline-flex">
                <BookOpenTextIcon data-icon="inline-start" />
                With docs
              </Badge>
            }
          />
          <TooltipContent side="bottom">Claude records the glossary and ADRs as decisions settle</TooltipContent>
        </Tooltip>
      )}
      <div className="flex-1" />
      {!state.ended && (
        <Button variant="outline" size="sm" onClick={onEnd}>
          <FireExtinguisherIcon data-icon="inline-start" />
          <span className="hidden sm:inline">End session</span>
        </Button>
      )}
      {/* Far right: the main call to action. */}
      {actions}
    </header>
  );
}
