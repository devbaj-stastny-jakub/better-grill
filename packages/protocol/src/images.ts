/*
 * Image limits, shared by the bridge and the UI. Kept apart from index.ts, which pulls
 * in zod: the UI imports these at runtime from "@better-grill/protocol/images".
 */

/** Image types the UI accepts, with the file extension the bridge saves them under. No SVG: it can carry script. */
export const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Images on one answer or chat message. */
export const MAX_IMAGES = 8;
