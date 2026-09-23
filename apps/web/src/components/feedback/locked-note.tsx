import type { ReactNode } from "react";
import { LockIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";

/** Quiet explanation of why a control is disabled. */
export function LockedNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <LockIcon className="size-3 shrink-0" />
      {children}
    </p>
  );
}
