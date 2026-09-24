import { rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { IMAGE_TYPES, type ImageType, MAX_IMAGE_BYTES } from "@better-grill/protocol";
import { HttpError } from "./session.ts";

export type StoredImage = { path: string; type: ImageType };

export type ImageStore = ReturnType<typeof createImageStore>;

/** Images the user attached, saved as files in `dir` so Claude can read them. Gone when the bridge exits. */
export function createImageStore(dir: string) {
  const images = new Map<string, StoredImage>();
  let count = 0;

  return {
    async save(type: ImageType, base64: string): Promise<string> {
      const data = Buffer.from(base64, "base64");
      if (data.length === 0) throw new HttpError(400, "Image is empty");
      if (data.length > MAX_IMAGE_BYTES) {
        throw new HttpError(413, `Image is over ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
      }
      const id = `img${++count}`;
      const path = join(dir, `${id}.${IMAGE_TYPES[type]}`);
      await mkdir(dir, { recursive: true });
      await writeFile(path, data);
      images.set(id, { path, type });
      return id;
    },

    get(id: string): StoredImage | undefined {
      return images.get(id);
    },

    /** Throws on an id this bridge never saved. */
    paths(ids: string[]): string[] {
      return ids.map((id) => {
        const image = images.get(id);
        if (!image) throw new HttpError(400, `Unknown image ${id}`);
        return image.path;
      });
    },

    /** Sync, so it also runs from process.on("exit"). */
    clear() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
