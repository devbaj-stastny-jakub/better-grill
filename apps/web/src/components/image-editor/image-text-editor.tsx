import { type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { MAX_IMAGES } from "@better-grill/protocol/images";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  DROP_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  KEY_ENTER_COMMAND,
  mergeRegister,
  PASTE_COMMAND,
} from "lexical";
import { imageFiles, imageProblem, imageUrl, uploadImage } from "@/lib/images.ts";
import { cn } from "@/lib/utils.ts";
import { type Attachment, EditorImagesContext } from "./image-context.ts";
import { $createImageNode, $isImageNode, ImageNode } from "./image-node.tsx";
import { IMAGE_TOKEN, imageToken } from "./tokens.ts";

/**
 * What the editor holds, ready to send: `text` with an `[Image N]` marker where each
 * image sits, and `images` (bridge ids) in marker order. Don't send while `uploading`.
 */
export type ImageDraft = { text: string; images: string[]; uploading: boolean; empty: boolean };

export const EMPTY_DRAFT: ImageDraft = { text: "", images: [], uploading: false, empty: true };

export type ImageTextEditorHandle = {
  /** Insert images at the caret (or the end) and upload them. */
  insertFiles: (files: File[]) => void;
  clear: () => void;
  /** Back to saved text and images, e.g. when discarding changes. */
  reset: (text: string, images: string[]) => void;
  focus: () => void;
};

type Props = {
  ref?: Ref<ImageTextEditorHandle>;
  initialText?: string;
  initialImages?: string[];
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** Extra attributes for the editable element, e.g. data-answer-item. */
  editableProps?: Record<`data-${string}`, string | boolean | undefined>;
  onChange: (draft: ImageDraft) => void;
  /** Plain Enter, with the draft as of this keystroke. Shift+Enter and ⌘/Ctrl+Enter make a new line. */
  onSubmit: (draft: ImageDraft) => void;
  onError: (message: string) => void;
};

/**
 * A text box that takes pasted and dropped images as pills inside the text, so the
 * user can say which image they mean. Plain text otherwise (Lexical, plain-text mode).
 */
export function ImageTextEditor(props: Props) {
  const { initialText = "", initialImages = [] } = props;
  const initialConfig = {
    namespace: "image-text",
    nodes: [ImageNode],
    editable: !props.disabled,
    theme: { paragraph: "m-0" },
    onError: (error: Error) => {
      throw error;
    },
    editorState: () => $writeText(initialText, initialImages),
  };
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <Editor {...props} />
    </LexicalComposer>
  );
}

type Piece = string | { attachment: string };

function Editor({
  ref,
  initialImages = [],
  placeholder,
  disabled = false,
  invalid,
  className,
  editableProps,
  onChange,
  onSubmit,
  onError,
}: Props) {
  const [editor] = useLexicalComposerContext();
  const [attachments, setAttachments] = useState<ReadonlyMap<string, Attachment>>(() => savedAttachments(initialImages));
  const [pieces, setPieces] = useState<Piece[]>(() => editor.getEditorState().read($readPieces));
  const objectUrls = useRef(new Set<string>());

  const { draft, numbers } = useMemo(() => toDraft(pieces, attachments), [pieces, attachments]);

  // Lexical's listeners and the draft effect read the latest handlers from here.
  const latest = useRef({ insertFiles: (_files: File[], _at?: Range) => {}, onSubmit, onChange, attachments });
  useEffect(() => {
    latest.current = { insertFiles, onSubmit, onChange, attachments };
  });

  useEffect(() => latest.current.onChange(draft), [draft]);

  useEffect(() => {
    const read = () => {
      const next = editor.getEditorState().read($readPieces);
      // Caret moves update the editor too; only a changed text is news.
      setPieces((current) => (samePieces(current, next) ? current : next));
    };
    // The initial text may land after the first render.
    read();
    return editor.registerUpdateListener(read);
  }, [editor]);

  useEffect(() => editor.setEditable(!disabled), [editor, disabled]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const forget = (key: string) => {
    setAttachments((current) => {
      const next = new Map(current);
      next.delete(key);
      return next;
    });
    editor.update(() => {
      for (const node of $allImageNodes()) {
        if (node.getAttachment() === key) node.remove();
      }
    });
  };

  const insertFiles = (files: File[], at?: Range) => {
    const room = MAX_IMAGES - numbers.size;
    if (files.length > room) onError(`Up to ${MAX_IMAGES} images each.`);
    const keys: string[] = [];
    for (const file of files.slice(0, Math.max(room, 0))) {
      const problem = imageProblem(file);
      if (problem) {
        onError(problem);
        continue;
      }
      const key = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      objectUrls.current.add(preview);
      keys.push(key);
      setAttachments((current) => new Map(current).set(key, { preview }));
      uploadImage(file).then(
        (id) => setAttachments((current) => (current.has(key) ? new Map(current).set(key, { id, preview }) : current)),
        (error: unknown) => {
          onError(error instanceof Error ? error.message : String(error));
          forget(key);
        },
      );
    }
    if (keys.length === 0) return;
    editor.update(() => {
      if (at) {
        const selection = $createRangeSelection();
        selection.applyDOMRange(at);
        $setSelection(selection);
      }
      if (!$isRangeSelection($getSelection())) $getRoot().selectEnd();
      $insertNodes(keys.flatMap((key) => [$createImageNode(key), $createTextNode(" ")]));
    });
    editor.focus();
  };

  const clearAttachments = (next: ReadonlyMap<string, Attachment>) => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current.clear();
    setAttachments(next);
  };

  const reset = (text: string, images: string[]) => {
    clearAttachments(savedAttachments(images));
    editor.update(() => $writeText(text, images));
    // Undo must not bring back pills whose images are gone.
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  };

  useImperativeHandle(ref, () => ({
    insertFiles: (files) => insertFiles(files),
    clear: () => reset("", []),
    reset,
    focus: () => editor.focus(),
  }));

  useEffect(
    () =>
      mergeRegister(
        // The editor owns Enter inside its box: plain Enter submits, with Shift or ⌘/Ctrl it's a new line.
        editor.registerCommand(
          KEY_ENTER_COMMAND,
          (event) => {
            if (!event || event.isComposing) return false;
            event.preventDefault();
            if (event.shiftKey || event.metaKey || event.ctrlKey) return editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
            // React state can trail fast typing by a keystroke: submit what the editor holds right now.
            const { attachments: current, onSubmit: submit } = latest.current;
            submit(toDraft($readPieces(), current).draft);
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          PASTE_COMMAND,
          (event) => {
            const files = "clipboardData" in event ? imageFiles(event.clipboardData) : [];
            if (files.length === 0) return false;
            event.preventDefault();
            latest.current.insertFiles(files);
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          DROP_COMMAND,
          (event) => {
            const files = imageFiles(event.dataTransfer);
            if (files.length === 0) return false;
            event.preventDefault();
            latest.current.insertFiles(files, rangeFromPoint(event.clientX, event.clientY));
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
      ),
    [editor],
  );

  return (
    <EditorImagesContext.Provider value={{ attachments, numbers }}>
      <div className="relative w-full min-w-0 flex-1">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              {...editableProps}
              data-slot="input-group-control"
              aria-invalid={invalid || undefined}
              aria-disabled={disabled || undefined}
              aria-placeholder={placeholder}
              placeholder={
                <div className="pointer-events-none absolute top-2 left-2.5 text-base text-muted-foreground select-none md:text-sm">
                  {placeholder}
                </div>
              }
              className={cn(
                "w-full overflow-y-auto px-2.5 py-2 text-base break-words whitespace-pre-wrap outline-none md:text-sm",
                disabled && "cursor-not-allowed",
                className,
              )}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
      </div>
    </EditorImagesContext.Provider>
  );
}

function savedAttachments(ids: string[]): ReadonlyMap<string, Attachment> {
  return new Map(ids.map((id) => [id, { id, preview: imageUrl(id) }]));
}

function $allImageNodes(): ImageNode[] {
  return $getRoot()
    .getChildren()
    .flatMap((block) => ($isElementNode(block) ? block.getChildren().filter($isImageNode) : []));
}

/** The document as text runs and images, in order. Paragraphs join with a line break. */
function $readPieces(): Piece[] {
  const pieces: Piece[] = [];
  $getRoot()
    .getChildren()
    .forEach((block, i) => {
      if (i > 0) pieces.push("\n");
      if (!$isElementNode(block)) return;
      for (const node of block.getChildren()) {
        if ($isImageNode(node)) pieces.push({ attachment: node.getAttachment() });
        else if ($isLineBreakNode(node)) pieces.push("\n");
        else if ($isTextNode(node)) pieces.push(node.getTextContent());
      }
    });
  return pieces;
}

/** Replaces the document with sent text, turning `[Image N]` back into the Nth saved image. */
function $writeText(text: string, images: string[]) {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  const mentioned = new Set<string>();
  text.split(IMAGE_TOKEN).forEach((part, i) => {
    if (i % 2 === 1) {
      const id = images[Number(part) - 1];
      if (id) {
        mentioned.add(id);
        paragraph.append($createImageNode(id));
      } else {
        paragraph.append($createTextNode(imageToken(Number(part))));
      }
      return;
    }
    part.split("\n").forEach((line, j) => {
      if (j > 0) paragraph.append($createLineBreakNode());
      if (line) paragraph.append($createTextNode(line));
    });
  });
  for (const id of images) if (!mentioned.has(id)) paragraph.append($createTextNode(" "), $createImageNode(id));
  root.append(paragraph);
}

function toDraft(pieces: Piece[], attachments: ReadonlyMap<string, Attachment>) {
  const numbers = new Map<string, number>();
  const images: string[] = [];
  let text = "";
  let uploading = false;
  for (const piece of pieces) {
    if (typeof piece === "string") {
      text += piece;
      continue;
    }
    let number = numbers.get(piece.attachment);
    if (number === undefined) {
      number = numbers.size + 1;
      numbers.set(piece.attachment, number);
      const id = attachments.get(piece.attachment)?.id;
      if (id) images.push(id);
      else uploading = true;
    }
    text += imageToken(number);
  }
  const draft: ImageDraft = { text, images, uploading, empty: text.trim() === "" };
  return { draft, numbers };
}

function samePieces(a: Piece[], b: Piece[]) {
  return (
    a.length === b.length &&
    a.every((piece, i) => {
      const other = b[i];
      return typeof piece === "string" ? piece === other : typeof other !== "string" && other?.attachment === piece.attachment;
    })
  );
}

/** Where a drop landed in the text, as a DOM range. */
function rangeFromPoint(x: number, y: number): Range | undefined {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (!position) return undefined;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    return range;
  }
  return document.caretRangeFromPoint?.(x, y) ?? undefined;
}
