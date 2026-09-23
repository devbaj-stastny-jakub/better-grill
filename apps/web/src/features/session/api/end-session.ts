import { post } from "@/lib/api-client.ts";

/** Tells Claude to wrap up. Unsent locked-in answers go with it. */
export const endSession = () => post("/api/end", {});
