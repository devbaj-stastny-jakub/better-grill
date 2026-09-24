import { createContext, useContext } from "react";

/** An image in the editor. No `id` yet: still uploading to the bridge. */
export type Attachment = { id?: string; preview: string };

type EditorImages = {
  attachments: ReadonlyMap<string, Attachment>;
  /** "Image N" label of each attachment key, by first appearance in the text. */
  numbers: ReadonlyMap<string, number>;
};

export const EditorImagesContext = createContext<EditorImages>({ attachments: new Map(), numbers: new Map() });

export const useEditorImages = () => useContext(EditorImagesContext);
