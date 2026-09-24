import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useTheme } from "@/lib/theme.tsx";
import { cn } from "@/lib/utils.ts";
import { frameDocument, MAX_FRAME_HEIGHT, readTokens, SIZE_MESSAGE } from "../utils/frame-document.ts";

let fonts: Promise<string> | undefined;
/** Fetched the first time a frame shows, not with the app. */
const loadFonts = () => (fonts ??= import("../utils/fonts.ts").then((m) => m.FONT_FACES));

/**
 * Claude's page in a sandboxed frame: scripts run, but with an opaque origin they can't
 * reach the bridge, the app or its storage. The frame grows to the page's height.
 * A theme switch rebuilds the page, so it restarts in the new theme.
 */
export function VisualizationFrame({ html, title, className }: { html: string; title: string; className?: string }) {
  const { resolved } = useTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    void loadFonts().then((fontFaces) => {
      if (live) setSrcDoc(frameDocument({ fragment: html, theme: resolved, tokens: readTokens(), fontFaces }));
    });
    return () => {
      live = false;
    };
  }, [html, resolved]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (data?.type !== SIZE_MESSAGE || typeof data.height !== "number" || !Number.isFinite(data.height)) return;
      setHeight(Math.min(Math.max(Math.round(data.height), 0), MAX_FRAME_HEIGHT));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {height === null && (
        <div className="grid h-48 place-items-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      )}
      {srcDoc && (
        <iframe
          ref={frame}
          title={title}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          style={height === null ? undefined : { height }}
          className={cn("block w-full border-0", height === null && "pointer-events-none absolute inset-0 h-48 opacity-0")}
        />
      )}
    </div>
  );
}
