import type { ImageUploaded } from "@better-grill/protocol";
import { IMAGE_TYPES, type ImageType, MAX_IMAGE_BYTES } from "@better-grill/protocol/images";
import { ActionError, post } from "./api-client.ts";

export const imageUrl = (id: string) => `/api/images/${id}`;

export function isImageType(type: string): type is ImageType {
  return type in IMAGE_TYPES;
}

/**
 * Image files in a paste or drop. Reads `items` first: Firefox puts a pasted
 * screenshot there and leaves `files` empty.
 */
export function imageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const fromItems = [...data.items].flatMap((item) => (item.kind === "file" ? [item.getAsFile()] : []));
  const files = fromItems.length > 0 ? fromItems : [...data.files];
  return files.filter((file): file is File => !!file && isImageType(file.type));
}

/** Why the bridge would refuse this file, or null when it is fine. */
export function imageProblem(file: File): string | null {
  if (!isImageType(file.type)) return `${file.name || "That file"} is not a PNG, JPEG, GIF or WebP image.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name || "That image"} is over ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`;
  return null;
}

/** Saves the image in the bridge, which answers the id answers and chat messages refer to it by. */
export async function uploadImage(file: File): Promise<string> {
  const problem = imageProblem(file);
  if (problem) throw new ActionError(problem);
  const { id } = await post<ImageUploaded>("/api/images", { type: file.type, data: await toBase64(file) });
  return id;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // A data URL: "data:image/png;base64,<data>".
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(new ActionError(`Couldn't read ${file.name || "the image"}.`));
    reader.readAsDataURL(file);
  });
}
