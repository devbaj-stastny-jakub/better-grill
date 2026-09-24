import { useCallback, useEffect, useState } from "react";
import type { Question } from "@better-grill/protocol";
import { useHotkey } from "@tanstack/react-hotkeys";
import { CrashedBlock } from "@/components/errors/crashed-block.tsx";
import { ErrorBoundary } from "@/components/errors/error-boundary.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { STORAGE_KEYS } from "@/config/constants.ts";
import { HOTKEYS } from "@/config/hotkeys.ts";
import { DISCUSSION_DOCK_MS, DiscussionDock } from "@/features/discussion/components/discussion-dock.tsx";
import { DiscussionPanel } from "@/features/discussion/components/discussion-panel.tsx";
import { useUnread } from "@/features/discussion/hooks/use-unread.ts";
import { AppSidebar } from "@/features/navigation/components/app-sidebar.tsx";
import { DiscussButton } from "@/features/rounds/components/discuss-button.tsx";
import { EarlierChanges } from "@/features/rounds/components/earlier-changes.tsx";
import { QuestionCard } from "@/features/rounds/components/question-card.tsx";
import { QuestionRow } from "@/features/rounds/components/question-row.tsx";
import { RoundSection } from "@/features/rounds/components/round-section.tsx";
import { SendBar } from "@/features/rounds/components/send-bar.tsx";
import { SendButton } from "@/features/rounds/components/send-button.tsx";
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
import { VisualizationView } from "@/features/visualization/components/visualization-view.tsx";
import { VisualizeButton } from "@/features/visualization/components/visualize-button.tsx";
import { useVisualViews } from "@/features/visualization/hooks/use-visual-views.ts";
import { useLingering } from "@/hooks/use-lingering.ts";
import { usePersistentState } from "@/hooks/use-persistent-state.ts";
import { lockReason } from "@/lib/lock.ts";
import { cn } from "@/lib/utils.ts";
import { anchors } from "@/utils/anchors.ts";
import { changedEarlier, liveQuestions, roundQuestions } from "@/utils/question.ts";

/** The whole grill: composes the features around the live session state, one step on screen at a time. */
export function SessionScreen() {
  const { state, connection } = useSessionStream();
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = usePersistentState(STORAGE_KEYS.sidebarOpen, true);
  // The question page's floating action bar renders into this, at the very end of the page.
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);

  const chatQuestion = chatFor ? state?.questions[chatFor] : undefined;
  // Still rendered while the dock slides out.
  const dockedFor = useLingering(chatFor, DISCUSSION_DOCK_MS);
  const dockedQuestion = dockedFor ? state?.questions[dockedFor] : undefined;
  const closeChat = useCallback(() => setChatFor(null), []);
  const unread = useUnread(chatQuestion);

  const { current, go, lockedIn } = useStep(state);
  const onScreen = current?.kind === "question" ? current.id : null;
  const onScreenQuestion = onScreen ? state?.questions[onScreen] : undefined;
  const views = useVisualViews(onScreenQuestion);

  // An open discussion follows the step: it switches to each question as it comes on screen.
  useEffect(() => {
    if (onScreen) setChatFor((now) => (now && now !== onScreen ? onScreen : now));
  }, [onScreen]);

  useHotkey(HOTKEYS.discuss, () => setChatFor((now) => (onScreen && now !== onScreen ? onScreen : null)));
  useHotkey(HOTKEYS.visualize, () => onScreen && views.toggle(onScreen), {
    enabled: !!onScreenQuestion && onScreenQuestion.status !== "dropped",
  });

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
  const actionBar = current?.kind === "question";
  // The latest round's review also lists earlier answers changed since Claude got them: this Send carries them too.
  const earlier = current?.kind === "review" && round === state.rounds.at(-1) ? changedEarlier(state) : [];

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
    const visual = views.showing(id) && question.status !== "dropped";
    const { discussing, unread: unreadCount, onDiscuss } = questionProps(question);
    const visualizeButton = (
      <VisualizeButton
        active={visual}
        working={question.visualization?.status === "pending"}
        unseen={views.unseen(question)}
        onClick={() => views.toggle(id)}
        hotkey={HOTKEYS.visualize}
      />
    );
    return (
      // Remount on Claude's edits so the card drops picks on options that changed.
      // Both views stay mounted while switching, so a draft answer and the visualization survive it.
      <ErrorBoundary
        key={`${id}-${question.editedAt ?? 0}`}
        fallback={(error, reset) => <CrashedBlock what={`Question ${id}`} error={error} onReset={reset} />}
      >
        <div hidden={visual}>
          <QuestionCard
            {...questionProps(question)}
            lock={lock}
            onLockedIn={() => lockedIn(id)}
            actionsSlot={visual ? null : actionsSlot}
            extraActions={visualizeButton}
            hidden={visual}
          />
        </div>
        {(visual || question.visualization) && (
          <div hidden={!visual}>
            <VisualizationView
              question={question}
              lock={lock}
              actionsSlot={visual ? actionsSlot : null}
              actions={
                <>
                  <DiscussButton
                    count={question.chat.length}
                    unread={unreadCount}
                    active={discussing}
                    onClick={onDiscuss}
                    hotkey={HOTKEYS.discuss}
                  />
                  {visualizeButton}
                </>
              }
            />
          </div>
        )}
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

      {/* Transparent, so the dotted canvas shows between the floating panels. The right padding is the gap before the screen edge or the discussion. */}
      <SidebarInset
        className={cn(
          // Eases aside for the discussion in step with the dock's slide.
          "min-w-0 bg-transparent pr-3 transition-[padding] duration-200 ease-linear",
          chatQuestion && "pr-[calc(var(--chat-w)+0.75rem)]",
        )}
      >
        {/* The gaps around the header stay click-through; a strip of canvas above it hides the page scrolling by. */}
        <div className="pointer-events-none sticky top-0 z-30 space-y-2 pt-3 *:pointer-events-auto before:absolute before:inset-x-0 before:top-0 before:h-3 before:canvas">
          <SessionHeader
            state={state}
            connection={connection}
            onEnd={() => setConfirmingEnd(true)}
            actions={<SendButton state={state} lock={lock} onJump={go} />}
          />
          <ConnectionBanner state={state} connection={connection} />
        </div>

        {state.rounds.length === 0 ? (
          // Optical centre: a little above the middle, like the loading screen.
          <div className="grid flex-1 place-items-center px-4 pt-8 pb-[16svh]">
            {state.ended ? <EndedEmpty /> : <WaitingForRound state={state} />}
          </div>
        ) : (
          <div className={cn("px-8 pt-8", actionBar ? "flex flex-1 flex-col pb-3" : "pb-32")}>
            <div className={cn("mx-auto max-w-3xl", actionBar && "flex w-full flex-1 flex-col")}>
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
                  {earlier.length > 0 && <EarlierChanges>{earlier.map((q) => questionRow(q.id))}</EarlierChanges>}
                </div>
              )}

              <SendBar
                state={state}
                lock={lock}
                onJump={go}
                showBar={current?.kind === "review"}
              />

              {actionBar && (
                <>
                  {/* Room to scroll the question clear of the bar's fade; grows so a short page still puts the bar at the bottom. */}
                  <div aria-hidden className="min-h-20 flex-1" />
                  {/* Last in the page, so where it rests at the end is where it sticks while scrolling: the bottom. */}
                  <div ref={setActionsSlot} className="sticky bottom-3 z-20" />
                </>
              )}
            </div>
          </div>
        )}
      </SidebarInset>

      <DiscussionDock open={!!chatQuestion}>
        {dockedQuestion && (
          <ErrorBoundary
            key={dockedQuestion.id}
            fallback={(error, reset) => (
              <div className="h-full bg-background p-4">
                <CrashedBlock what="Discussion" error={error} onReset={reset} />
              </div>
            )}
          >
            <DiscussionPanel question={dockedQuestion} lock={lock} claude={state.claude} onClose={closeChat} />
          </ErrorBoundary>
        )}
      </DiscussionDock>

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
