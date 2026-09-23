import { post } from "@/lib/api-client.ts";

/** Confirm Claude's summary, or send it back with what is missing. */
export const respondSummary = (confirmed: boolean, text?: string) => post("/api/summary/respond", { confirmed, text });
