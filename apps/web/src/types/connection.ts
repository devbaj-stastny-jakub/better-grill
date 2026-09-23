/**
 * - connecting: first attempt, nothing received yet
 * - open: stream is live
 * - reconnecting: stream dropped (or never came up) and we are retrying
 * - closed: session ended and the bridge is gone; we stopped retrying on purpose
 */
export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

export type Connection = {
  status: ConnectionStatus;
  /** When the current status started. */
  since: number;
  /** Retries since the stream was last open. */
  attempts: number;
  /** The stream has been open at least once. */
  everOpened: boolean;
};
