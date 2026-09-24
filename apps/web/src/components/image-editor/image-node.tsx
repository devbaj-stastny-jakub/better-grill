import type { JSX } from "react";
import { DecoratorNode, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from "lexical";
import { EditorImagePill } from "./image-pill.tsx";

type SerializedImageNode = Spread<{ attachment: string }, SerializedLexicalNode>;

/**
 * An attached image inside the text: one atomic pill that the caret steps over and one
 * Backspace removes. `attachment` is its key in the editor's attachment list.
 */
export class ImageNode extends DecoratorNode<JSX.Element> {
  __attachment: string;

  static override getType() {
    return "image-attachment";
  }

  static override clone(node: ImageNode) {
    return new ImageNode(node.__attachment, node.__key);
  }

  static override importJSON(json: SerializedImageNode) {
    return $createImageNode(json.attachment);
  }

  constructor(attachment: string, key?: NodeKey) {
    super(key);
    this.__attachment = attachment;
  }

  override exportJSON(): SerializedImageNode {
    return { ...super.exportJSON(), attachment: this.__attachment };
  }

  getAttachment() {
    return this.getLatest().__attachment;
  }

  override createDOM() {
    return document.createElement("span");
  }

  override updateDOM() {
    return false;
  }

  override isInline() {
    return true;
  }

  // Backspace next to the pill deletes it, instead of first selecting it.
  override isKeyboardSelectable() {
    return false;
  }

  override getTextContent() {
    return "[Image]";
  }

  override decorate() {
    return <EditorImagePill attachment={this.__attachment} />;
  }
}

export function $createImageNode(attachment: string) {
  return new ImageNode(attachment);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
