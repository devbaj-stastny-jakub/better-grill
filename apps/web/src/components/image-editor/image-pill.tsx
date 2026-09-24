import { EyeIcon } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { imageUrl } from "@/lib/images.ts";
import { cn } from "@/lib/utils.ts";
import { useEditorImages } from "./image-context.ts";

type Props = {
  number: number;
  src: string;
  /** Read only: clicking opens the image full size. */
  href?: string;
  uploading?: boolean;
  /** "inverse" on a primary-coloured background, like the user's chat bubble. */
  tone?: "default" | "inverse";
};

/** "👁 Image 1" inside text. Hover shows the image. */
export function ImagePill({ number, src, href, uploading, tone = "default" }: Props) {
  const label = `Image ${number}`;
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        closeDelay={100}
        render={href ? <a href={href} target="_blank" rel="noreferrer" /> : <span />}
        className={cn(
          "mx-px inline-flex items-center gap-1 rounded-md px-1.5 align-baseline text-[0.85em] leading-snug font-medium whitespace-nowrap select-none",
          tone === "inverse"
            ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
            : "bg-primary/10 text-primary hover:bg-primary/15",
          href ? "cursor-zoom-in" : "cursor-default",
        )}
      >
        {uploading ? <Spinner className="size-3" aria-label="Uploading" /> : <EyeIcon className="size-3" aria-hidden />}
        {label}
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-auto p-1.5">
        <img src={src} alt={label} className="block max-h-72 max-w-80 rounded-md object-contain" />
      </HoverCardContent>
    </HoverCard>
  );
}

/** The pill an ImageNode renders in the editor, numbered by its place in the text. */
export function EditorImagePill({ attachment }: { attachment: string }) {
  const { attachments, numbers } = useEditorImages();
  const image = attachments.get(attachment);
  if (!image) return null;
  return <ImagePill number={numbers.get(attachment) ?? 0} src={image.id ? imageUrl(image.id) : image.preview} uploading={!image.id} />;
}
