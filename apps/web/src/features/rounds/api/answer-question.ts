import type { AnswerRequest } from "@better-grill/protocol";
import { post } from "@/lib/api-client.ts";

/** Locks in an answer. It stays in the bridge until the round is sent. */
export const answerQuestion = (id: string, request: AnswerRequest) => post(`/api/questions/${id}/answer`, request);
