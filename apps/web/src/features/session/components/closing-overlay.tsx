import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const CLOSE_AFTER_S = 3;

/** Full-screen goodbye with a countdown, then the tab closes itself. */
export function ClosingOverlay() {
  const [left, setLeft] = useState(CLOSE_AFTER_S);
  const [blocked, setBlocked] = useState(false);

  const close = () => {
    window.close();
    // Browsers refuse window.close() for tabs a script did not open (and history > 1).
    setTimeout(() => setBlocked(true), 300);
  };

  useEffect(() => {
    if (left <= 0) {
      close();
      return;
    }
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = left / CLOSE_AFTER_S;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-background/95 backdrop-blur-md animate-in fade-in-0">
      <div className="px-4 text-center">
        <div className="relative mx-auto size-20">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-2xl font-semibold tabular-nums">
            {blocked ? <CheckIcon className="size-7 text-success" /> : Math.max(left, 0)}
          </span>
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight">Session ended</h2>
        <p className="mt-2 text-muted-foreground">
          {blocked
            ? "Your browser kept this tab open. Close it whenever you like."
            : `Back to your terminal. This tab closes in ${Math.max(left, 0)}s.`}
        </p>
        {!blocked && (
          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground" onClick={close}>
            Close now
          </Button>
        )}
      </div>
    </div>
  );
}
