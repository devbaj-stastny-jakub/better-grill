import { useEffect, useRef, useState } from "react";
import type { SessionState } from "@better-grill/protocol";
import { RECONNECT_BACKOFF_MS } from "@/config/constants.ts";
import type { Connection } from "@/types/connection.ts";

/**
 * Live session state, pushed by the bridge over SSE on every change.
 * Reconnects by itself with backoff; EventSource gives up for good on a non-200
 * answer, so we manage retries ourselves.
 */
export function useSessionStream() {
  const [state, setState] = useState<SessionState | null>(null);
  const [connection, setConnection] = useState<Connection>(() => ({
    status: "connecting",
    since: Date.now(),
    attempts: 0,
    everOpened: false,
  }));
  const ended = useRef(false);

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let disposed = false;

    const connect = () => {
      source = new EventSource("/api/stream");
      source.onopen = () => {
        attempts = 0;
        setConnection({ status: "open", since: Date.now(), attempts: 0, everOpened: true });
      };
      source.onmessage = (event: MessageEvent<string>) => {
        try {
          const next = JSON.parse(event.data) as SessionState;
          ended.current = next.ended;
          setState(next);
        } catch (error) {
          console.error("Bad frame from bridge", error);
        }
      };
      source.onerror = () => {
        source?.close();
        if (disposed) return;
        // An ended session whose bridge went away is done, not broken.
        if (ended.current) {
          setConnection((c) => ({ ...c, status: "closed", since: Date.now() }));
          return;
        }
        attempts += 1;
        setConnection((c) => ({
          status: "reconnecting",
          since: c.status === "reconnecting" ? c.since : Date.now(),
          attempts,
          everOpened: c.everOpened,
        }));
        retry = setTimeout(connect, RECONNECT_BACKOFF_MS[Math.min(attempts - 1, RECONNECT_BACKOFF_MS.length - 1)]);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      source?.close();
    };
  }, []);

  return { state, connection };
}
