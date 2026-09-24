import type { ChatRequest } from "@better-grill/protocol";
import { post } from "@/lib/api-client.ts";

/** Posts to a question's discussion. Goes to Claude right away, unlike answers. */
export const sendChat = (id: string, request: ChatRequest) => post(`/api/questions/${id}/chat`, request);
