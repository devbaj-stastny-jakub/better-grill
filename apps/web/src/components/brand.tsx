import { useState } from "react";
import { Grill } from "@/components/grill.tsx";
import { cn } from "@/lib/utils.ts";

/** Orange tile with the grill. Its heat waves shimmer while the tile is hovered. */
export function BrandMark({ className }: { className?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <Grill hot={hovered} className="size-4" />
    </span>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <span className="text-sm font-semibold tracking-tight">better grill</span>
    </div>
  );
}
