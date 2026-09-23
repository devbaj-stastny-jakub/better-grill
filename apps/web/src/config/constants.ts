/** localStorage keys. Prefixed so several local apps on one origin don't collide. */
export const STORAGE_KEYS = {
  sidebarOpen: "better-grill:rail-expanded",
  sidebarWidth: "better-grill:sidebar-width",
  chatWidth: "better-grill:chat-width",
  theme: "better-grill:theme",
  warmUp: "better-grill:warm-up",
} as const;

/** How long a POST to the bridge may take before we call it failed. */
export const REQUEST_TIMEOUT_MS = 10_000;

/** Backoff between SSE reconnects. The last value repeats. */
export const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000];
