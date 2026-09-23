import { useEffect, useRef, useState } from "react";
import type { Question } from "@better-grill/protocol";
import { useHotkey } from "@tanstack/react-hotkeys";
import { SparklesIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { LockedNote } from "@/components/feedback/locked-note.tsx";
import { PendingLabel } from "@/components/feedback/pending-label.tsx";
import { HotkeyHint } from "@/components/hotkey-hint.tsx";
import { Markdown } from "@/components/markdown.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { HOTKEYS } from "@/config/hotkeys.ts";
import { useAction } from "@/hooks/use-action.ts";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { anchors } from "@/utils/scroll.ts";
import { insertNewline } from "@/utils/text-input.ts";
import { answerQuestion } from "../api/answer-question.ts";
import { focusFirstAnswerIn, focusNextQuestionAfter, moveAnswerFocus, settleReveal } from "../utils/answer-nav.ts";
import { setActiveQuestion, useIsActiveQuestion } from "../stores/active-question.ts";
import { DiscussButton } from "./discuss-button.tsx";
import { OptionList } from "./option-list.tsx";

type Props = {
  question: Question;
  lock: LockReason;
  discussing: boolean;
  unread: number;
  onDiscuss: () => void;
  /** Back out of changing an existing answer. Unmounting drops the edits. */
  onCancel: () => void;
  /** Focus the first option on mount (the user pressed "Change"). */
  focusOnOpen?: boolean;
};

type FocusZone = "option" | "text" | null;

/** Open question, or an answered one being changed: pick options, write text, lock in. */
export function QuestionEditor({ question, lock, discussing, unread, onDiscuss, onCancel, focusOnOpen = false }: Props) {
  const locked = lock !== null;
  const [selected, setSelected] = useState<string[]>(question.answer?.optionIds ?? []);
  const [text, setText] = useState(question.answer?.text ?? "");
  const answerAction = useAction(answerQuestion);

  const toggle = (id: string) => {
    answerAction.clearError();
    setSelected((current) => {
      if (question.multiSelect) return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return current[0] === id ? [] : [id];
    });
  };

  const sending = answerAction.pending;
  const hasInput = selected.length > 0 || text.trim().length > 0;
  const canSend = !locked && !sending && hasInput;
  const changing = question.status === "answered";

  const card = useRef<HTMLDivElement>(null);
  const answerBox = useRef<HTMLTextAreaElement>(null);
  const [zone, setZone] = useState<FocusZone>(null);

  const send = async (optionIds = selected) => {
    if (locked || sending || (optionIds.length === 0 && !text.trim())) return;
    const ok = await answerAction.run(question.id, { optionIds, text: text.trim() || undefined });
    // Carry on to the next open question, unless the user already moved elsewhere.
    const focus = document.activeElement;
    if (ok && card.current && (focus === document.body || card.current.contains(focus))) focusNextQuestionAfter(card.current);
  };

  // Enter on an option: single-select picks that one; multi-select keeps the ticks (or takes this one if none).
  const lockInOption = (optionId: string) => {
    const optionIds = question.multiSelect ? (selected.length > 0 ? selected : [optionId]) : [optionId];
    setSelected(optionIds);
    void send(optionIds);
  };

  useEffect(() => {
    if (focusOnOpen && card.current) focusFirstAnswerIn(card.current);
  }, [focusOnOpen]);

  // This editor collapsing shifts the page; let the keyboard jump that led away from it land cleanly.
  useEffect(() => settleReveal, []);

  // One editor at a time owns ⌘↵; the others stay registered but silent.
  // In a text box ⌘↵ means a new line (below), so it only locks in from elsewhere.
  const active = useIsActiveQuestion(question.id);
  useHotkey(
    HOTKEYS.lockIn,
    (event) => {
      if ((event.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
      void send();
    },
    { enabled: active && canSend, conflictBehavior: "allow" },
  );
  const activate = () => setActiveQuestion(question.id);

  // Keys handled inside this card only. They let the event through unless they act on it.
  const scoped = { target: card, ignoreInputs: false, preventDefault: false, stopPropagation: false };
  const walk = (event: KeyboardEvent, step: 1 | -1) => {
    const item = event.target as HTMLElement;
    if (!item.matches("[data-answer-item]")) return;
    // In the textarea, arrows move the caret until it hits the start (↑) or the end (↓).
    if (item instanceof HTMLTextAreaElement) {
      const atEdge = step === -1 ? item.selectionEnd === 0 : item.selectionStart === item.value.length;
      if (!atEdge) return;
    }
    if (moveAnswerFocus(item, step)) event.preventDefault();
  };
  useHotkey(HOTKEYS.nextAnswer, (event) => walk(event, 1), scoped);
  useHotkey(HOTKEYS.previousAnswer, (event) => walk(event, -1), scoped);
  // Enter on an option or in the answer box locks in, like Enter sends in the discussion.
  useHotkey(
    HOTKEYS.submitAnswer,
    (event) => {
      const target = event.target as HTMLElement;
      if (target.dataset.optionId) {
        event.preventDefault(); // no click, so the option isn't toggled off again
        lockInOption(target.dataset.optionId);
      } else if (target === answerBox.current && !event.isComposing) {
        event.preventDefault();
        void send();
      }
      // Anywhere else (Discuss, Cancel) Enter keeps its normal meaning.
    },
    scoped,
  );
  useHotkey(
    HOTKEYS.newLine,
    (event) => {
      const box = answerBox.current;
      if (!box || event.target !== box) return;
      event.preventDefault();
      insertNewline(box);
    },
    { ...scoped, conflictBehavior: "allow" },
  );

  const trackZone = (event: React.FocusEvent) => {
    const target = event.target as HTMLElement;
    setZone(target.dataset.optionId ? "option" : target instanceof HTMLTextAreaElement ? "text" : null);
  };

  const kind = question.options.length === 0 ? "Open answer" : question.multiSelect ? "Pick any" : "Pick one";

  return (
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
      className={cn(
        "scroll-mt-20 gap-5 pt-5 shadow-xs transition-shadow",
        discussing ? "ring-1 ring-primary/45" : "hover:shadow-sm",
      )}
    >
      <CardHeader className="gap-2 px-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="font-mono">{question.id}</Badge>
          <span className="text-xs text-muted-foreground">{kind}</span>
          {question.editedAt && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <SparklesIcon data-icon="inline-start" />
              Edited by Claude
            </Badge>
          )}
          {changing && <Badge variant="outline">Changing answer</Badge>}
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight text-balance">{question.title}</CardTitle>
        {question.body && (
          <CardDescription>
            <Markdown>{question.body}</Markdown>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="grid gap-4 px-5 sm:px-6">
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

        <Textarea
          ref={answerBox}
          data-answer-item
          value={text}
          disabled={locked || sending}
          onChange={(e) => {
            answerAction.clearError();
            setText(e.target.value);
          }}
          rows={2}
          placeholder={
            question.options.length === 0
              ? "Your answer…"
              : selected.length > 0
                ? "Add a note to your pick (optional)…"
                : "Or write your own answer…"
          }
          className="min-h-20 scroll-mt-20 scroll-mb-32 resize-y"
        />

        {answerAction.error && (
          <ErrorNote message={answerAction.error} onRetry={() => void send()} onDismiss={answerAction.clearError} />
        )}
      </CardContent>

      <CardFooter className="gap-2 px-5 sm:px-6">
        <DiscussButton count={question.chat.length} unread={unread} active={discussing} onClick={onDiscuss} />
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
            {question.options.length > 0 ? "Pick or type" : "Type an answer"}
          </span>
        )}
        {changing && (
          <Button variant="ghost" disabled={sending} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={!canSend} onClick={() => void send()}>
          <PendingLabel pending={sending} pendingLabel="Locking in…" label={changing ? "Update answer" : "Lock in"} />
        </Button>
      </CardFooter>
    </Card>
  );
}

function KeyHints({ children }: { children: React.ReactNode }) {
  return <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">{children}</span>;
}
