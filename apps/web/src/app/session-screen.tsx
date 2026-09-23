import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionState } from "@better-grill/protocol";
import { CrashedBlock } from "@/components/errors/crashed-block.tsx";
import { ErrorBoundary } from "@/components/errors/error-boundary.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { STORAGE_KEYS } from "@/config/constants.ts";
import { DiscussionDock } from "@/features/discussion/components/discussion-dock.tsx";
import { DiscussionPanel } from "@/features/discussion/components/discussion-panel.tsx";
import { useUnread } from "@/features/discussion/hooks/use-unread.ts";
import { AppSidebar } from "@/features/navigation/components/app-sidebar.tsx";
import { QuestionCard } from "@/features/rounds/components/question-card.tsx";
import { RoundSection } from "@/features/rounds/components/round-section.tsx";
import { SendBar } from "@/features/rounds/components/send-bar.tsx";
import { focusRound } from "@/features/rounds/utils/answer-nav.ts";
import { useSessionStream } from "@/features/session/api/use-session-stream.ts";
import { ClosingOverlay } from "@/features/session/components/closing-overlay.tsx";
import { ConnectionBanner } from "@/features/session/components/connection-banner.tsx";
import { EndSessionDialog } from "@/features/session/components/end-session-dialog.tsx";
import { LoadingScreen } from "@/features/session/components/loading-screen.tsx";
import { EndedEmpty, WaitingForRound } from "@/features/session/components/session-empty.tsx";
import { SessionHeader } from "@/features/session/components/session-header.tsx";
import { UnreachableScreen } from "@/features/session/components/unreachable-screen.tsx";
import { SummaryPanel } from "@/features/summary/components/summary-panel.tsx";
import { usePersistentState } from "@/hooks/use-persistent-state.ts";
import { lockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { liveQuestions, roundQuestions } from "@/utils/question.ts";
import { anchors, scrollToAnchor } from "@/utils/scroll.ts";

/** The whole grill: composes the features around the live session state. */
export function SessionScreen() {
  const { state, connection } = useSessionStream();
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = usePersistentState(STORAGE_KEYS.sidebarOpen, true);

  const chatQuestion = chatFor ? state?.questions[chatFor] : undefined;
  const closeChat = useCallback(() => setChatFor(null), []);
  const unread = useUnread(chatQuestion);

  useFollowConversation(state);

  if (!state) {
    // Give the first connect a couple of tries before calling the bridge gone.
    const gone = connection.status === "reconnecting" && connection.attempts >= 2;
    return gone ? <UnreachableScreen connection={connection} /> : <LoadingScreen />;
  }

  const lock = lockReason(state, connection);
  const live = liveQuestions(Object.values(state.questions));

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      // --app-sidebar-w is owned by AppSidebar, which lets the user drag it.
      style={{ "--sidebar-width": "var(--app-sidebar-w, 20rem)" } as React.CSSProperties}
    >
      <AppSidebar state={state} chatFor={chatFor} unread={unread} onOpenChat={setChatFor} />

      <SidebarInset className="min-w-0">
        <SessionHeader state={state} connection={connection} onEnd={() => setConfirmingEnd(true)} />
        <ConnectionBanner state={state} connection={connection} />

        <div className={cn("px-4 pt-8 pb-32 sm:px-8", chatQuestion && "xl:pr-[calc(var(--chat-w)+2rem)]")}>
          <div className="mx-auto max-w-3xl">
            {state.rounds.length === 0 && (state.ended ? <EndedEmpty /> : <WaitingForRound claude={state.claude} />)}

            {state.rounds.map((round) => (
              <RoundSection key={round.number} round={round} questions={roundQuestions(state, round.questionIds)}>
                {round.questionIds.map((id, index) => {
                  const question = state.questions[id];
                  if (!question) return null;
                  return (
                    // Remount on Claude's edits so the card drops picks on options that changed.
                    <div
                      key={`${id}-${question.editedAt ?? 0}`}
                      className="animate-in fill-mode-both fade-in-0 slide-in-from-bottom-2 animation-duration-500"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <ErrorBoundary fallback={(error, reset) => <CrashedBlock what={`Question ${id}`} error={error} onReset={reset} />}>
                        <QuestionCard
                          question={question}
                          lock={lock}
                          discussing={chatFor === id}
                          unread={unread(question)}
                          onDiscuss={() => setChatFor((current) => (current === id ? null : id))}
                        />
                      </ErrorBoundary>
                    </div>
                  );
                })}
              </RoundSection>
            ))}

            <SendBar state={state} lock={lock} />

            {state.summary && (
              <ErrorBoundary fallback={(error, reset) => <CrashedBlock what="Summary" error={error} onReset={reset} />}>
                <SummaryPanel summary={state.summary} lock={lock} />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </SidebarInset>

      {chatQuestion && (
        <DiscussionDock>
          <ErrorBoundary
            key={chatQuestion.id}
            fallback={(error, reset) => (
              <div className="h-full border-l bg-background p-4">
                <CrashedBlock what="Discussion" error={error} onReset={reset} />
              </div>
            )}
          >
            <DiscussionPanel question={chatQuestion} lock={lock} claude={state.claude} onClose={closeChat} />
          </ErrorBoundary>
        </DiscussionDock>
      )}

      <EndSessionDialog
        open={confirmingEnd}
        unsent={live.filter((q) => q.status === "answered" && !q.answer?.sent).length}
        openCount={live.filter((q) => q.status === "open").length}
        onCancel={() => setConfirmingEnd(false)}
        onEnded={() => {
          setConfirmingEnd(false);
          setClosing(true);
        }}
      />
      {closing && <ClosingOverlay />}
    </SidebarProvider>
  );
}

/** Jump to each new round (and focus its first open question) and to the summary as Claude posts them. */
function useFollowConversation(state: SessionState | null) {
  const roundCount = state?.rounds.length ?? 0;
  const hasSummary = !!state?.summary;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (hasSummary) {
      scrollToAnchor(anchors.summary);
      return;
    }
    const round = anchors.round(roundCount);
    scrollToAnchor(round);
    focusRound(document.getElementById(round));
  }, [roundCount, hasSummary]);
}
