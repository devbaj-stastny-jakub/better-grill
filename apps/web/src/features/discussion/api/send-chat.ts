import { post } from "@/lib/api-client.ts";

/** Posts to a question's discussion. Goes to Claude right away, unlike answers. */
export const sendChat = (id: string, text: string) => post(`/api/questions/${id}/chat`, { text });
