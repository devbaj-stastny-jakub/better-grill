import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** The question page's action bar, portalled into the slot at the end of the page that sticks to the bottom of the screen. */
export function FloatingActions({ slot, children }: { slot: HTMLElement; children: ReactNode }) {
  return createPortal(
    <>
      {/* The question dissolves into the canvas behind the bar: fixed dots line up with the page's, masked in from the top. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-3 -top-24 -bottom-3 canvas [mask-image:linear-gradient(to_bottom,transparent,black_65%)]"
      />
      <div className="relative flex items-center gap-2 rounded-xl border bg-popover/95 px-4 py-3 shadow-lg backdrop-blur-md sm:px-5">
        {children}
      </div>
    </>,
    slot,
  );
}
