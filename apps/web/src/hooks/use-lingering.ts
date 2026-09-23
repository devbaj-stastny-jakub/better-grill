import { useEffect, useState } from "react";

/** `value`, but after it goes empty the last one lingers for `ms`, so an exit animation has something to show. */
export function useLingering<T>(value: T | null, ms: number): T | null {
  const [kept, setKept] = useState(value);
  // Adjust state while rendering (not in an effect), so a new value shows in the same frame.
  if (value !== null && value !== kept) setKept(value);

  useEffect(() => {
    if (value !== null) return;
    const timer = setTimeout(() => setKept(null), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return value ?? kept;
}
