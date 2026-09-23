import { cn } from "@/lib/utils.ts";

/** Three coals catching one after another, in the current text colour. The app's "working on it" loader. */
export function Coals({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center gap-[0.3em]", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-[0.4em] rounded-full bg-current opacity-60 motion-safe:animate-coal"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}
