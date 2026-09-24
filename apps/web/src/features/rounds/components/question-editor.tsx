import { type ReactNode, useRef, useState } from "react";
import type { Question } from "@better-grill/protocol";
import { useHotkey } from "@tanstack/react-hotkeys";
import { CircleCheckIcon, SparklesIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import { HotkeyHint } from "@/components/hotkey-hint.tsx";
import { DropOverlay } from "@/components/drop-overlay.tsx";
import { FloatingActions } from "@/components/floating-actions.tsx";
import { type ImageDraft, ImageTextEditor, type ImageTextEditorHandle } from "@/components/image-editor/image-text-editor.tsx";
import { Markdown } from "@/components/markdown.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { InputGroup } from "@/components/ui/input-group.tsx";
import { HOTKEYS } from "@/config/hotkeys.ts";
import { useAction } from "@/hooks/use-action.ts";
import { useFileDrop } from "@/hooks/use-file-drop.ts";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { anchors } from "@/utils/anchors.ts";
import { caretAtEdge } from "@/utils/text-input.ts";
import { answerQuestion } from "../api/answer-question.ts";
import { moveAnswerFocus } from "../utils/answer-nav.ts";
import { setActiveQuestion, useIsActiveQuestion } from "../stores/active-question.ts";
import { DiscussButton } from "./discuss-button.tsx";
import { OptionList } from "./option-list.tsx";

type Props = {
  question: Question;
  lock: LockReason;
  discussing: boolean;
  unread: number;
  onDiscuss: () => void;
  /** The bridge took the answer: move on. */
  onLockedIn: () => void;
  /** Where the floating action bar goes: a slot at the end of the page, stuck to the bottom of the screen. */
  actionsSlot?: HTMLElement | null;
  /** Extra controls next to Discuss in the action bar (the switch to the visualization). */
  extraActions?: ReactNode;
  /** Kept mounted behind another view, so the draft survives: its shortcuts stay off. */
  hidden?: boolean;
};

type FocusZone = "option" | "text" | null;

/** A question on its own page, open or answered: pick options, write text, lock in (or update the answer). */
export function QuestionEditor({
  question,
  lock,
  discussing,
  unread,
  onDiscuss,
  onLockedIn,
  actionsSlot,
  extraActions,
  hidden = false,
}: Props) {
  const locked = lock !== null;
  const [selected, setSelected] = useState<string[]>(question.answer?.optionIds ?? []);
  const [draft, setDraft] = useState<ImageDraft>(() => savedDraft(question));
  const [imageError, setImageError] = useState<string | null>(null);
  const answerAction = useAction(answerQuestion);
  const answerBox = useRef<ImageTextEditorHandle>(null);
  const drop = useFileDrop({
    disabled: locked,
    onFiles: (files) => answerBox.current?.insertFiles(files),
    onReject: setImageError,
  });

  const toggle = (id: string) => {
    answerAction.clearError();
    setSelected((current) => {
      if (question.multiSelect) return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return current[0] === id ? [] : [id];
    });
  };

  const saved = question.answer;
  const changing = question.status === "answered";
  const unchanged = (optionIds: string[], current = draft) =>
    sameIds(optionIds, saved?.optionIds ?? []) &&
    current.text.trim() === (saved?.text ?? "").trim() &&
    sameIds(current.images, saved?.images ?? []) &&
    !current.uploading;
  const dirty = changing && !unchanged(selected);

  const sending = answerAction.pending;
  const hasInput = selected.length > 0 || !draft.empty;
  const canSend = !locked && !sending && !draft.uploading && hasInput && (!changing || dirty);

  const discard = () => {
    answerAction.clearError();
    setSelected(saved?.optionIds ?? []);
    answerBox.current?.reset(saved?.text ?? "", saved?.images ?? []);
  };

  const card = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState<FocusZone>(null);

  const send = async (optionIds = selected, current = draft) => {
    if (locked || sending || current.uploading || (optionIds.length === 0 && current.empty)) return;
    // Enter on the answer already locked in: nothing to save, carry on.
    if (changing && unchanged(optionIds, current)) {
      onLockedIn();
      return;
    }
    const ok = await answerAction.run(question.id, {
      optionIds,
      text: current.text.trim() || undefined,
      images: current.images,
    });
    if (ok) onLockedIn();
  };

  // Enter on an option: single-select picks that one; multi-select keeps the ticks (or takes this one if none).
  const lockInOption = (optionId: string) => {
    const optionIds = question.multiSelect ? (selected.length > 0 ? selected : [optionId]) : [optionId];
    setSelected(optionIds);
    void send(optionIds);
  };

  // The editor last clicked owns ⌘↵ (Safari buttons do not keep focus on click).
  // In a text box ⌘↵ means a new line (below), so it only locks in from elsewhere.
  const active = useIsActiveQuestion(question.id);
  useHotkey(
    HOTKEYS.lockIn,
    (event) => {
      if ((event.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
      void send();
    },
    { enabled: active && canSend && !hidden, conflictBehavior: "allow" },
  );
  const activate = () => setActiveQuestion(question.id);

  // Keys handled inside this card only. They let the event through unless they act on it.
  const scoped = { target: card, ignoreInputs: false, preventDefault: false, stopPropagation: false };
  const walk = (event: KeyboardEvent, step: 1 | -1) => {
    const item = event.target as HTMLElement;
    if (!item.matches("[data-answer-item]")) return;
    // In the answer box, arrows move the caret until it hits the start (↑) or the end (↓).
    if (item.isContentEditable && !caretAtEdge(item, step)) return;
    if (moveAnswerFocus(item, step)) event.preventDefault();
  };
  useHotkey(HOTKEYS.nextAnswer, (event) => walk(event, 1), scoped);
  useHotkey(HOTKEYS.previousAnswer, (event) => walk(event, -1), scoped);
  // Enter on an option locks in. In the answer box the editor owns Enter (onSubmit below), like in the discussion.
  useHotkey(
    HOTKEYS.submitAnswer,
    (event) => {
      const target = event.target as HTMLElement;
      if (!target.dataset.optionId) return; // Discuss, Discard changes: Enter keeps its normal meaning
      event.preventDefault(); // no click, so the option isn't toggled off again
      lockInOption(target.dataset.optionId);
    },
    scoped,
  );

  const trackZone = (event: React.FocusEvent) => {
    const target = event.target as HTMLElement;
    setZone(target.dataset.optionId ? "option" : target.isContentEditable ? "text" : null);
  };

  const kind = question.options.length === 0 ? "Open answer" : question.multiSelect ? "Pick any" : "Pick one";

  const actions = (
    <>
      <DiscussButton
        count={question.chat.length}
        unread={unread}
        active={discussing}
        onClick={onDiscuss}
        hotkey={HOTKEYS.discuss}
      />
      {extraActions}
      <div className="flex-1" />
      {lock ? (
        <LockedNote>{LOCK_COPY[lock]}</LockedNote>
      ) : zone === "option" ? (
        <KeyHints>
          <HotkeyHint hotkey={HOTKEYS.previousAnswer} />
          <HotkeyHint hotkey={HOTKEYS.nextAnswer} /> move
          <HotkeyHint hotkey={HOTKEYS.submitAnswer} className="ml-1.5" /> lock in
        </KeyHints>
      ) : zone === "text" ? (
        <KeyHints>
          <HotkeyHint hotkey={HOTKEYS.submitAnswer} /> lock in
          <HotkeyHint hotkey={HOTKEYS.newLine} className="ml-1.5" /> new line
        </KeyHints>
      ) : active && hasInput ? (
        <KeyHints>
          <HotkeyHint hotkey={HOTKEYS.lockIn} /> lock in
        </KeyHints>
      ) : (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {question.options.length > 0 ? "Pick, type or drop an image" : "Type an answer or drop an image"}
        </span>
      )}
      {dirty && (
        <Button variant="ghost" disabled={sending} onClick={discard}>
          Discard changes
        </Button>
      )}
      <Button disabled={!canSend} onClick={() => void send()}>
        <PendingLabel pending={sending} pendingLabel="Locking in…" label={changing ? "Update answer" : "Lock in"} />
      </Button>
    </>
  );

  const editor = (
    <Card
      ref={card}
      id={anchors.question(question.id)}
      data-question-editor
      onPointerDownCapture={activate}
      onFocusCapture={(event) => {
        activate();
        trackZone(event);
      }}
      onBlurCapture={(event) => {
        if (!card.current?.contains(event.relatedTarget as Node | null)) setZone(null);
      }}
      {...drop.dropZone}
      className={cn(
        "relative scroll-mt-20 gap-5 pt-5 shadow-xs transition-shadow",
        discussing ? "ring-1 ring-primary/45" : "hover:shadow-sm",
      )}
    >
      <DropOverlay show={drop.dragging} />
      {/* grid-cols-1 (minmax(0,1fr)): a wide table or code block scrolls instead of stretching the card. */}
      <CardHeader className="grid-cols-1 gap-2 px-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="font-mono">{question.id}</Badge>
          <span className="text-xs text-muted-foreground">{kind}</span>
          {question.editedAt && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <SparklesIcon data-icon="inline-start" />
              Edited by Claude
            </Badge>
          )}
          {changing && (
            <Badge variant="secondary" className="bg-success/10 text-success">
              <CircleCheckIcon data-icon="inline-start" />
              {saved?.sent ? "Sent to Claude" : "Locked in"}
            </Badge>
          )}
          {saved?.by === "claude" && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <SparklesIcon data-icon="inline-start" />
              Resolved in discussion by Claude
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-balance">{question.title}</CardTitle>
        {question.body && (
          <CardDescription>
            <Markdown>{question.body}</Markdown>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-4 px-5 sm:px-6">
        {question.options.length > 0 && (
          <OptionList question={question} selected={selected} disabled={locked || sending} onToggle={toggle} />
        )}

        {question.recommendation && (
          <Alert className="border-primary/20 bg-primary/5">
            <SparklesIcon className="text-primary" />
            <AlertTitle className="text-primary">Claude's pick</AlertTitle>
            <AlertDescription className="text-foreground/80">
              <Markdown>{question.recommendation}</Markdown>
            </AlertDescription>
          </Alert>
        )}

        {/* Images sit in the text as pills, so the answer can say which one it means. */}
        <InputGroup className="h-auto">
          <ImageTextEditor
            ref={answerBox}
            initialText={saved?.text}
            initialImages={saved?.images}
            disabled={locked || sending}
            invalid={!!answerAction.error}
            editableProps={{ "data-answer-item": !(locked || sending) || undefined }}
            onChange={(next) => {
              if (next.text !== draft.text) answerAction.clearError();
              setDraft(next);
            }}
            onSubmit={(current) => void send(selected, current)}
            onError={setImageError}
            placeholder={
              question.options.length === 0
                ? "Your answer… (paste or drop images)"
                : selected.length > 0
                  ? "Add a note to your pick (optional)…"
                  : "Or write your own answer…"
            }
            className="max-h-80 min-h-20 scroll-mt-20 scroll-mb-32"
          />
        </InputGroup>
        {imageError && <ErrorNote message={imageError} onDismiss={() => setImageError(null)} />}

        {answerAction.error && (
          <ErrorNote message={answerAction.error} onRetry={() => void send()} onDismiss={answerAction.clearError} />
        )}
      </CardContent>

    </Card>
  );
  if (!actionsSlot) return editor;

  return (
    <>
      {editor}
      <FloatingActions slot={actionsSlot}>{actions}</FloatingActions>
    </>
  );
}

function savedDraft(question: Question): ImageDraft {
  const text = question.answer?.text ?? "";
  const images = question.answer?.images ?? [];
  return { text, images, uploading: false, empty: !text.trim() && images.length === 0 };
}

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

function KeyHints({ children }: { children: React.ReactNode }) {
  return <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">{children}</span>;
}
