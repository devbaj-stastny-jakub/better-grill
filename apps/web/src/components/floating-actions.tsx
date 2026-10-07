import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils.ts";

type Props = { slot: HTMLElement; className?: string; children: ReactNode };

/** A step's action bar, portalled into the slot at the end of the page that sticks to the bottom of the screen. */
export function FloatingActions({ slot, className, children }: Props) {
  return createPortal(
    <>
      {/* The page dissolves into the canvas behind the bar: fixed dots line up with the page's, masked in from the top. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-3 -top-24 -bottom-3 canvas [mask-image:linear-gradient(to_bottom,transparent,black_65%)]"
      />
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-xl border bg-popover/95 px-4 py-3 shadow-lg backdrop-blur-md sm:px-5",
          className,
        )}
      >
        {children}
      </div>
    </>,
    slot,
  );
}
