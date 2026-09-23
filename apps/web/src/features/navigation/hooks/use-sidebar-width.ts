import { STORAGE_KEYS } from "@/config/constants.ts";
import { useCssVar } from "@/hooks/use-css-var.ts";
import { usePersistentState } from "@/hooks/use-persistent-state.ts";

export const SIDEBAR_WIDTH = { min: 240, initial: 320, max: 520 };

/** Expanded sidebar width in px, remembered across reloads, mirrored to `--app-sidebar-w`. */
export function useSidebarWidth() {
  const [stored, setWidth] = usePersistentState(STORAGE_KEYS.sidebarWidth, SIDEBAR_WIDTH.initial);
  const width = Math.min(Math.max(stored, SIDEBAR_WIDTH.min), SIDEBAR_WIDTH.max);
  useCssVar("--app-sidebar-w", `${width}px`);
  return [width, setWidth] as const;
}
