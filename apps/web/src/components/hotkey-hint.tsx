import { formatForDisplay, type RegisterableHotkey } from "@tanstack/react-hotkeys";
import { Kbd, KbdGroup } from "@/components/ui/kbd.tsx";

/** Platform-correct key caps for a shortcut: ⌘ ↵ on macOS, Ctrl ↵ elsewhere. */
export function HotkeyHint({ hotkey, className }: { hotkey: RegisterableHotkey; className?: string }) {
  const parts = formatForDisplay(hotkey, { parts: true });
  return (
    <KbdGroup className={className}>
      {parts.map((part) => (
        <Kbd key={part}>{part}</Kbd>
      ))}
    </KbdGroup>
  );
}
