import type { SessionState } from "@better-grill/protocol";
import { PaintBucketIcon } from "lucide-react";
import { HotkeyHint } from "@/components/hotkey-hint.tsx";
import { ThemeToggle } from "@/components/theme-toggle.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { HOTKEYS } from "@/config/hotkeys.ts";
import type { Connection } from "@/types/connection.ts";
import { liveQuestions } from "@/utils/question.ts";
import { StatusBadge } from "./status-badge.tsx";

type Props = { state: SessionState; connection: Connection; onEnd: () => void };

export function SessionHeader({ state, connection, onEnd }: Props) {
  const questions = liveQuestions(Object.values(state.questions));
  const answered = questions.filter((q) => q.status === "answered").length;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <Tooltip>
        <TooltipTrigger render={<SidebarTrigger className="-ml-1" />} />
        <TooltipContent side="bottom">
          Toggle panel <HotkeyHint hotkey={HOTKEYS.toggleSidebar} />
        </TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
      <h1 className="min-w-0 truncate text-sm font-medium">{state.title}</h1>
      <div className="flex-1" />
      {questions.length > 0 && (
        <p className="hidden text-sm text-muted-foreground tabular-nums md:block">
          <span className="font-medium text-foreground">{answered}</span>/{questions.length} settled
        </p>
      )}
      <StatusBadge state={state} connection={connection} />
      <ThemeToggle />
      {!state.ended && (
        <Button variant="outline" size="sm" onClick={onEnd}>
          <PaintBucketIcon data-icon="inline-start" />
          <span className="hidden sm:inline">End session</span>
        </Button>
      )}
    </header>
  );
}
