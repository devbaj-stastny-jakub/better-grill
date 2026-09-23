import type { SessionState } from "@better-grill/protocol";
import type { Connection } from "@/types/connection.ts";

/** Why input is disabled right now, if it is. */
export type LockReason = "ended" | "offline" | null;

export function lockReason(state: SessionState, connection: Connection): LockReason {
  if (state.ended) return "ended";
  if (connection.status !== "open") return "offline";
  return null;
}

export const LOCK_COPY: Record<Exclude<LockReason, null>, string> = {
  ended: "Session has ended.",
  offline: "Bridge unreachable. Reconnecting…",
};
