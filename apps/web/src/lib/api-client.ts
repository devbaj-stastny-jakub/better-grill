import { REQUEST_TIMEOUT_MS } from "@/config/constants.ts";

export class ActionError extends Error {}

/** POST JSON to the bridge. Throws ActionError with copy that can go straight into the UI. */
export async function post(path: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ActionError(`The bridge did not answer within ${REQUEST_TIMEOUT_MS / 1000} seconds. Try again.`);
    }
    throw new ActionError("Can't reach the bridge. Is the Claude Code session still running?");
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    const detail = data?.error ?? response.statusText;
    if (response.status >= 500) {
      throw new ActionError(`The bridge hit an error: ${detail}. Its log path was printed by \`grill start\`.`);
    }
    throw new ActionError(detail || `Request failed (${response.status}).`);
  }
}
