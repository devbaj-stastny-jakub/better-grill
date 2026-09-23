import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils.ts";

type Props = {
  /** Screen edge the panel is anchored to. The handle sits on the opposite edge of the panel. */
  side: "left" | "right";
  /** CSS custom property on <html> that sizes the panel. Written directly while dragging. */
  cssVar: string;
  width: number;
  min: number;
  max: number;
  initial: number;
  /** Commits a width: on release, arrow keys, or double-click. */
  onResize: (width: number) => void;
  label: string;
  className?: string;
};

/**
 * Drag to resize, arrows to nudge, double-click to reset. While dragging it only
 * touches the CSS variable, so React does not re-render the page on every move.
 */
export function ResizeHandle({ side, cssVar, width, min, max, initial, onResize, label, className }: Props) {
  const [dragging, setDragging] = useState(false);
  const live = useRef(width);
  const active = useRef(false);
  const clamp = (value: number) => Math.round(Math.min(Math.max(value, min), max));

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    live.current = width;
    active.current = true;
    setDragging(true);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active.current) return;
    live.current = clamp(side === "left" ? event.clientX : window.innerWidth - event.clientX);
    document.documentElement.style.setProperty(cssVar, `${live.current}px`);
  };
  const stop = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    onResize(live.current);
  };

  // Keep the cursor, stop text selection and pause width transitions while dragging.
  useEffect(() => {
    if (!dragging) return;
    const root = document.documentElement;
    root.dataset.resizing = "";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      delete root.dataset.resizing;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  const grow = side === "left" ? "ArrowRight" : "ArrowLeft";
  const shrink = side === "left" ? "ArrowLeft" : "ArrowRight";

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onDoubleClick={() => onResize(clamp(initial))}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 80 : 20;
        if (event.key === grow) onResize(clamp(width + step));
        if (event.key === shrink) onResize(clamp(width - step));
      }}
      className={cn(
        // Named group: the sidebar root is a plain `group`, so bare group-hover would fire on any sidebar hover.
        "group/handle absolute inset-y-0 z-20 w-3 cursor-col-resize touch-none outline-none",
        side === "left" ? "-right-1.5" : "-left-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors",
          dragging ? "bg-primary" : "bg-transparent group-hover/handle:bg-primary/50 group-focus-visible/handle:bg-primary/50",
        )}
      />
      <span
        className={cn(
          "absolute top-1/2 left-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background opacity-0 transition-[opacity,background-color,border-color] group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100",
          dragging ? "border-primary bg-primary opacity-100" : "group-hover/handle:border-primary",
        )}
      />
    </div>
  );
}
