import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const CLOSE_AFTER_S = 3;
/** Hold on "0" with an empty ring before closing, so the countdown visibly finishes. */
const FINAL_BEAT_MS = 300;
const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Full-screen goodbye with a countdown, then the tab closes itself. */
export function ClosingOverlay({ title }: { title: string }) {
  const [left, setLeft] = useState(CLOSE_AFTER_S);
  const [blocked, setBlocked] = useState(false);
  const ring = useRef<SVGCircleElement>(null);

  const close = () => {
    window.close();
    // Browsers refuse window.close() for tabs a script did not open (and history > 1).
    setTimeout(() => setBlocked(true), 300);
  };

  // One continuous drain from mount; a per-tick CSS transition would sit still for the first second.
  useEffect(() => {
    const animation = ring.current?.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: CIRCUMFERENCE }], {
      duration: CLOSE_AFTER_S * 1000,
      easing: "linear",
      fill: "forwards",
    });
    return () => animation?.cancel();
  }, []);

  useEffect(() => {
    const timer = left > 0 ? setTimeout(() => setLeft((s) => s - 1), 1000) : setTimeout(close, FINAL_BEAT_MS);
    return () => clearTimeout(timer);
  }, [left]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-background/95 backdrop-blur-md animate-in fade-in-0">
      <div className="px-4 text-center">
        <div className="relative mx-auto size-20">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              ref={ring}
              cx="40"
              cy="40"
              r={RADIUS}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-2xl font-semibold tabular-nums">
            {blocked ? <CheckIcon className="size-7 text-success" /> : left}
          </span>
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-muted-foreground">
          {blocked
            ? "Your browser kept this tab open. Close it whenever you like."
            : `Back to your terminal. This tab closes in ${left}s.`}
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
