import { useHotkey } from "@tanstack/react-hotkeys";
import { useSidebar } from "@/components/ui/sidebar.tsx";
import { HOTKEYS } from "@/config/hotkeys.ts";

/** "[" toggles the sidebar. Ignored while typing (single-key hotkeys skip inputs by default). */
export function useSidebarHotkey() {
  const { toggleSidebar } = useSidebar();
  useHotkey(HOTKEYS.toggleSidebar, toggleSidebar);
}
