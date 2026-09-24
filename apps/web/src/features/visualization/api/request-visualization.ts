import type { VisualizeRequest } from "@better-grill/protocol";
import { post } from "@/lib/api-client.ts";

/** The Visualize button: Claude gets the request right away and builds the visualization in the background. */
export const requestVisualization = (id: string, request: VisualizeRequest) => post(`/api/questions/${id}/visualize`, request);
