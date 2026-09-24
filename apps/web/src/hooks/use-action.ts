import { useState } from "react";

/** Pending + error state around one bridge call. `run` resolves true on success. */
export function useAction<Args extends unknown[]>(action: (...args: Args) => Promise<unknown>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (...args: Args) => {
    setPending(true);
    setError(null);
    try {
      await action(...args);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setPending(false);
    }
  };

  return { run, pending, error, clearError: () => setError(null) };
}
