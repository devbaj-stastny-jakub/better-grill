import { useSyncExternalStore } from "react";

/*
 * The question the user last clicked or focused into. ⌘↵ locks in this one, so
 * the shortcut works after picking an option, not only while typing. Buttons
 * don't keep focus on click in Safari, so focus alone can't tell us.
 */
let active: string | null = null;
const listeners = new Set<() => void>();

export function setActiveQuestion(id: string) {
  if (active === id) return;
  active = id;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsActiveQuestion(id: string) {
  return useSyncExternalStore(subscribe, () => active === id);
}
