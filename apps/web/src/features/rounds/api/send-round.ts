import { post } from "@/lib/api-client.ts";

/** Sends every locked-in, unsent answer to Claude. */
export const sendRound = () => post("/api/send", {});
