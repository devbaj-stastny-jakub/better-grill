import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import { ShapesIcon } from "lucide-react";
import { HotkeyHint } from "@/components/hotkey-hint.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  /** The visualization view is on screen. */
  active: boolean;
  /** Claude is working on the visualization. */
  working: boolean;
  /** A page arrived the user hasn't looked at. */
  unseen: boolean;
  onClick: () => void;
  hotkey: RegisterableHotkey;
};

/** Switches a question between answering it and its visualization. */
export function VisualizeButton({ active, working, unseen, onClick, hotkey }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : "outline"}
            onClick={onClick}
            aria-pressed={active}
            className={cn("relative", active && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15")}
          >
            {working ? <Spinner data-icon="inline-start" /> : <ShapesIcon data-icon="inline-start" />}
            Visualization
            {unseen && !active && (
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary ring-2 ring-background" />
              </span>
            )}
          </Button>
        }
      />
      <TooltipContent>
        {active ? "Back to the question" : working ? "Claude is visualizing it" : "Show the visualization"} <HotkeyHint hotkey={hotkey} />
      </TooltipContent>
    </Tooltip>
  );
}
