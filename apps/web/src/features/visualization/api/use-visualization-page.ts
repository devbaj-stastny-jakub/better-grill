import { useEffect, useState } from "react";
import type { VisualizationPage } from "@better-grill/protocol";
import { get } from "@/lib/api-client.ts";

/** Pages by question and version. A version never changes, so each is fetched once. */
const pages = new Map<string, Promise<VisualizationPage>>();

function load(id: string, version: number) {
  const key = `${id}@${version}`;
  let page = pages.get(key);
  if (!page) {
    page = get<VisualizationPage>(`/api/questions/${id}/visualization`);
    page.catch(() => pages.delete(key));
    pages.set(key, page);
  }
  return page;
}

type PageState = { html: string | null; error: string | null; retry: () => void };

/** The HTML Claude posted for a question, at `version` (0: none yet). Keeps the previous page up while the next one loads. */
export function useVisualizationPage(id: string, version: number): PageState {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (version === 0) return;
    let live = true;
    setError(null);
    load(id, version).then(
      (page) => live && setHtml(page.html),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, [id, version, attempt]);

  return { html: version === 0 ? null : html, error, retry: () => setAttempt((n) => n + 1) };
}
