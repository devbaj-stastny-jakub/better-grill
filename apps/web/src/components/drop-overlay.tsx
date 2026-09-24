import { ImageIcon } from "lucide-react";

/** Covers a drop zone while images are dragged over it. Its parent needs `relative`. */
export function DropOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] border-2 border-dashed border-primary bg-background/85 backdrop-blur-sm animate-in fade-in-0">
      <span className="flex items-center gap-2 text-sm font-medium text-primary">
        <ImageIcon className="size-4" />
        Drop images to attach
      </span>
    </div>
  );
}
