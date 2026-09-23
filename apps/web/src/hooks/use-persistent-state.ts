import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/** useState that survives reloads via localStorage. Storage failures fall back to plain state. */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // private mode or blocked storage: keep in memory only
    }
  }, [key, value]);

  return [value, setValue];
}
