import { useEffect, useRef, useState } from "react";
import type { ClaudeStatus, Question } from "@better-grill/protocol";
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import { ArrowUpIcon, MessageSquareIcon, XIcon } from "lucide-react";
import { ErrorNote } from "@/components/feedback/error-note.tsx";
import { HotkeyHint } from "@/components/hotkey-hint.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { HOTKEYS } from "@/config/hotkeys.ts";
import { useAction } from "@/hooks/use-action.ts";
import { LOCK_COPY, type LockReason } from "@/lib/lock.ts";
import { awaitingClaude } from "@/utils/question.ts";
import { insertNewline } from "@/utils/text-input.ts";
import { sendChat } from "../api/send-chat.ts";
import { ChatMessage, ClaudeAvatar } from "./chat-message.tsx";

type Props = {
  question: Question;
  lock: LockReason;
  claude: ClaudeStatus;
  onClose: () => void;
};

/** Side thread for one question. Messages go to the open Claude Code session. */
export function DiscussionPanel({ question, lock, claude, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const chatAction = useAction(sendChat);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const waiting = awaitingClaude(question);
  const sending = chatAction.pending;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [question.chat.length, waiting]);

  useEffect(() => {
    input.current?.focus();
  }, [question.id]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || lock) return;
    // The draft stays until the bridge accepts it, so a failure never loses what was typed.
    if (await chatAction.run(question.id, text)) setDraft("");
  };

  // Enter sends; ⌘↵ and Shift+Enter make a new line. Enter that confirms an IME composition is left alone.
  const composer = { target: input, ignoreInputs: false, preventDefault: false };
  useHotkey(
    HOTKEYS.sendChat,
    (event) => {
      if (event.isComposing) return;
      event.preventDefault();
      void send();
    },
    composer,
  );
  useHotkey(
    HOTKEYS.newLine,
    (event) => {
      if (!input.current) return;
      event.preventDefault();
      insertNewline(input.current);
    },
    { ...composer, conflictBehavior: "allow" },
  );

  // Esc closes the thread unless the user is mid-sentence. Let the event through so open dialogs close first.
  useHotkey(
    HOTKEYS.closeChat,
    () => {
      if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) onClose();
    },
    { enabled: !draft.trim(), preventDefault: false, stopPropagation: false },
  );

  return (
    <aside className="flex h-full flex-col border-l bg-background">
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Discussing</span>
            <Badge className="font-mono">{question.id}</Badge>
            {question.status === "answered" &&
              (question.answer?.by === "claude" ? (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Resolved by Claude
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-success/10 text-success">
                  Answered
                </Badge>
              ))}
            {question.status === "dropped" && <Badge variant="outline">Dropped</Badge>}
          </div>
          <h2 className="mt-1.5 text-sm leading-snug font-semibold">{question.title}</h2>
        </div>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close discussion" />}>
            <XIcon />
          </TooltipTrigger>
          <TooltipContent>
            Close <HotkeyHint hotkey={HOTKEYS.closeChat} />
          </TooltipContent>
        </Tooltip>
      </header>

      {question.status === "dropped" && (
        <p className="border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          Claude dropped this question{question.dropReason ? `: ${question.dropReason}` : "."} You can still talk about it.
        </p>
      )}

      <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto px-4 py-5" aria-live="polite">
        {question.chat.length === 0 && (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquareIcon />
              </EmptyMedia>
              <EmptyTitle>Push back, ask why</EmptyTitle>
              <EmptyDescription>
                Anything you write here goes to Claude with this question as context. If you settle it here, Claude can resolve the
                question for you.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {question.chat.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {waiting && !lock && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <ClaudeAvatar />
            <Spinner className="size-3.5" />
            {claude === "listening" ? "Claude is reading…" : "Queued. Claude is busy and will answer next."}
          </div>
        )}
        {waiting && lock === "ended" && <p className="text-sm text-muted-foreground">The session ended before Claude replied.</p>}
      </div>

      <div className="border-t p-3">
        {chatAction.error && (
          <ErrorNote className="mb-2" message={chatAction.error} onRetry={() => void send()} onDismiss={chatAction.clearError} />
        )}
        <InputGroup className="bg-background">
          <InputGroupTextarea
            ref={input}
            value={draft}
            disabled={!!lock}
            aria-invalid={chatAction.error ? true : undefined}
            onChange={(e) => {
              chatAction.clearError();
              setDraft(e.target.value);
            }}
            rows={2}
            placeholder={lock ? LOCK_COPY[lock] : "Ask about this question…"}
            className="max-h-40 min-h-14"
          />
          <InputGroupAddon align="block-end">
            <span className="text-xs text-muted-foreground">
              {sending ? "Sending…" : `Enter to send · ${formatForDisplay(HOTKEYS.newLine)} for new line`}
            </span>
            <InputGroupButton
              variant="default"
              size="icon-sm"
              className="ml-auto rounded-full"
              onClick={() => void send()}
              disabled={!draft.trim() || sending || !!lock}
              aria-label={sending ? "Sending" : "Send"}
            >
              {sending ? <Spinner /> : <ArrowUpIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </aside>
  );
}
