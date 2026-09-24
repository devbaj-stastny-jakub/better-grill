import { useEffect, useState } from "react";
import { imageFiles } from "@/lib/images.ts";

const hasFiles = (event: React.DragEvent | DragEvent) => !!event.dataTransfer?.types.includes("Files");

/**
 * Makes an element take dropped images. Spread `dropZone` on it and show an overlay
 * while `dragging`. A drop the text editor inside already took (defaultPrevented) is left alone.
 */
export function useFileDrop({
  disabled = false,
  onFiles,
  onReject,
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onReject: (message: string) => void;
}) {
  const [dragging, setDragging] = useState(false);

  // A drop that misses every drop zone would open the image in place of the app.
  useEffect(() => {
    const guard = (event: DragEvent) => {
      if (event.defaultPrevented || !hasFiles(event)) return;
      event.preventDefault();
      if (event.type === "dragover") event.dataTransfer!.dropEffect = "none";
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  const takes = (event: React.DragEvent) => !disabled && hasFiles(event);

  const dropZone = {
    onDragEnter(event: React.DragEvent) {
      if (!takes(event)) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragOver(event: React.DragEvent) {
      if (!takes(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave(event: React.DragEvent) {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop(event: React.DragEvent) {
      setDragging(false);
      if (event.defaultPrevented || !takes(event)) return;
      event.preventDefault();
      const files = imageFiles(event.dataTransfer);
      if (files.length > 0) onFiles(files);
      else onReject("Only PNG, JPEG, GIF and WebP images can be attached.");
    },
  };

  return { dragging, dropZone };
}
