import { useCallback, useEffect, useState } from "react";
import type { Question } from "@better-grill/protocol";
import { CrashedBlock } from "@/components/errors/crashed-block.tsx";
import { ErrorBoundary } from "@/components/errors/error-boundary.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { STORAGE_KEYS } from "@/config/constants.ts";
import { DiscussionDock } from "@/features/discussion/components/discussion-dock.tsx";
import { DiscussionPanel } from "@/features/discussion/components/discussion-panel.tsx";
import { useUnread } from "@/features/discussion/hooks/use-unread.ts";
import { AppSidebar } from "@/features/navigation/components/app-sidebar.tsx";
import { QuestionCard } from "@/features/rounds/components/question-card.tsx";
import { QuestionRow } from "@/features/rounds/components/question-row.tsx";
import { RoundSection } from "@/features/rounds/components/round-section.tsx";
import { SendBar } from "@/features/rounds/components/send-bar.tsx";
import { focusStep } from "@/features/rounds/utils/answer-nav.ts";
import { useSessionStream } from "@/features/session/api/use-session-stream.ts";
import { ClosingOverlay } from "@/features/session/components/closing-overlay.tsx";
import { ConnectionBanner } from "@/features/session/components/connection-banner.tsx";
import { EndSessionDialog } from "@/features/session/components/end-session-dialog.tsx";
import { LoadingScreen } from "@/features/session/components/loading-screen.tsx";
import { EndedEmpty, WaitingForRound } from "@/features/session/components/session-empty.tsx";
import { SessionHeader } from "@/features/session/components/session-header.tsx";
import { UnreachableScreen } from "@/features/session/components/unreachable-screen.tsx";
import { useStep } from "@/features/stepper/hooks/use-step.ts";
import { SummaryPanel } from "@/features/summary/components/summary-panel.tsx";
import { usePersistentState } from "@/hooks/use-persistent-state.ts";
import { lockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { anchors } from "@/utils/anchors.ts";
import { liveQuestions, roundQuestions } from "@/utils/question.ts";

/** The whole grill: composes the features around the live session state, one step on screen at a time. */
export function SessionScreen() {
  const { state, connection } = useSessionStream();
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = usePersistentState(STORAGE_KEYS.sidebarOpen, true);

  const chatQuestion = chatFor ? state?.questions[chatFor] : undefined;
  const closeChat = useCallback(() => setChatFor(null), []);
  const unread = useUnread(chatQuestion);

  const { current, go, lockedIn } = useStep(state);

  // A new step starts at the top, with the keyboard on its first option.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    focusStep();
  }, [current?.key]);

  if (!state) {
    // Give the first connect a couple of tries before calling the bridge gone.
    const gone = connection.status === "reconnecting" && connection.attempts >= 2;
    return gone ? <UnreachableScreen connection={connection} /> : <LoadingScreen />;
  }

  const lock = lockReason(state, connection);
  const live = liveQuestions(Object.values(state.questions));
  const round = current?.kind === "summary" ? undefined : state.rounds.find((r) => r.number === current?.round);

  /** Shared by the question page and the review rows. */
  const questionProps = (question: Question) => ({
    question,
    discussing: chatFor === question.id,
    unread: unread(question),
    onDiscuss: () => setChatFor((now) => (now === question.id ? null : question.id)),
  });

  const questionCard = (id: string) => {
    const question = state.questions[id];
    if (!question) return null;
    return (
      // Remount on Claude's edits so the card drops picks on options that changed.
      <ErrorBoundary
        key={`${id}-${question.editedAt ?? 0}`}
        fallback={(error, reset) => <CrashedBlock what={`Question ${id}`} error={error} onReset={reset} />}
      >
        <QuestionCard {...questionProps(question)} lock={lock} onLockedIn={() => lockedIn(id)} />
      </ErrorBoundary>
    );
  };

  const questionRow = (id: string) => {
    const question = state.questions[id];
    if (!question) return null;
    return (
      <ErrorBoundary key={id} fallback={(error, reset) => <CrashedBlock what={`Question ${id}`} error={error} onReset={reset} />}>
        <QuestionRow {...questionProps(question)} onOpen={() => go(anchors.question(id))} />
      </ErrorBoundary>
    );
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      // --app-sidebar-w is owned by AppSidebar, which lets the user drag it.
      style={{ "--sidebar-width": "var(--app-sidebar-w, 20rem)" } as React.CSSProperties}
    >
      <AppSidebar
        state={state}
        current={current?.key ?? null}
        onJump={go}
        chatFor={chatFor}
        unread={unread}
        onOpenChat={setChatFor}
      />

      <SidebarInset className="min-w-0">
        <SessionHeader state={state} connection={connection} onEnd={() => setConfirmingEnd(true)} />
        <ConnectionBanner state={state} connection={connection} />

        {state.rounds.length === 0 ? (
          // Optical centre: a little above the middle, like the loading screen.
          <div className="grid flex-1 place-items-center px-4 pt-8 pb-[16svh]">
            {state.ended ? <EndedEmpty /> : <WaitingForRound state={state} />}
          </div>
        ) : (
          <div className={cn("px-4 pt-8 pb-32 sm:px-8", chatQuestion && "xl:pr-[calc(var(--chat-w)+2rem)]")}>
            <div className="mx-auto max-w-3xl">
              {current && (
                // Keyed by step so each one fades in fresh.
                <div
                  key={current.key}
                  className="mb-6 animate-in fill-mode-both fade-in-0 slide-in-from-bottom-2 animation-duration-300"
                >
                  {current.kind === "summary" && state.summary && (
                    <ErrorBoundary fallback={(error, reset) => <CrashedBlock what="Summary" error={error} onReset={reset} />}>
                      <SummaryPanel summary={state.summary} lock={lock} onConfirmed={() => setClosing("Summary confirmed")} />
                    </ErrorBoundary>
                  )}
                  {round && current.kind !== "summary" && (
                    <RoundSection
                      round={round}
                      questions={roundQuestions(state, round.questionIds)}
                      review={current.kind === "review"}
                    >
                      {current.kind === "question" ? questionCard(current.id) : round.questionIds.map(questionRow)}
                    </RoundSection>
                  )}
                </div>
              )}

              <SendBar state={state} lock={lock} onJump={go} />
            </div>
          </div>
        )}
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
          setClosing("Session ended");
        }}
      />
      {closing && <ClosingOverlay title={closing} />}
    </SidebarProvider>
  );
}
