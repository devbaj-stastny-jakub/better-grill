import { cn } from "@/lib/utils.ts";

/** A 16px ring filled clockwise to `value` (0 to 1), in the current text colour over a faint track. */
export function ProgressRing({ value, className }: { value: number; className?: string }) {
  const filled = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth={2} aria-hidden className={cn("-rotate-90", className)}>
      <circle cx="8" cy="8" r="6" className="stroke-current opacity-20" />
      <circle
        cx="8"
        cy="8"
        r="6"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - filled}
        strokeLinecap="round"
        className={cn("stroke-current transition-[stroke-dashoffset] duration-500 ease-out", filled === 0 && "opacity-0")}
      />
    </svg>
  );
}
