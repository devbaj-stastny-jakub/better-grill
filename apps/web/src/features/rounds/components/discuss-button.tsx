import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import { MessageSquareIcon } from "lucide-react";
import { HotkeyHint } from "@/components/hotkey-hint.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  count: number;
  unread: number;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  /** Shortcut shown in a tooltip, where one applies. */
  hotkey?: RegisterableHotkey;
};

export function DiscussButton({ hotkey, ...props }: Props) {
  if (!hotkey) return <DiscussButtonBase {...props} />;
  return (
    <Tooltip>
      <TooltipTrigger render={<DiscussButtonBase {...props} />} />
      <TooltipContent>
        {props.active ? "Close discussion" : "Discuss"} <HotkeyHint hotkey={hotkey} />
      </TooltipContent>
    </Tooltip>
  );
}

function DiscussButtonBase({
  count,
  unread,
  active,
  onClick,
  compact = false,
  ...rest
}: Omit<Props, "hotkey"> & React.ComponentProps<"button">) {
  // Icon alone gets a square button so the bubble sits centred.
  const iconOnly = compact && count === 0;
  return (
    <Button
      {...rest}
      variant={active ? "secondary" : "outline"}
      size={iconOnly ? "icon-sm" : compact ? "sm" : "default"}
      onClick={onClick}
      aria-pressed={active}
      aria-label={compact ? "Discuss" : undefined}
      className={cn("relative", active && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15")}
    >
      <MessageSquareIcon data-icon={iconOnly ? undefined : "inline-start"} />
      {!compact && "Discuss"}
      {count > 0 && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary ring-2 ring-background" />
        </span>
      )}
    </Button>
  );
}
