import type { Question, SessionState } from "@better-grill/protocol";
import { ClipboardCheckIcon } from "lucide-react";
import { BrandMark } from "@/components/brand.tsx";
import { ResizeHandle } from "@/components/resize-handle.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { roundLabel } from "@/utils/format.ts";
import { liveQuestions, roundQuestions } from "@/utils/question.ts";
import { anchors, scrollToAnchor } from "@/utils/scroll.ts";
import { useQuestionInView } from "../hooks/use-question-in-view.ts";
import { useSidebarHotkey } from "../hooks/use-sidebar-hotkey.ts";
import { SIDEBAR_WIDTH, useSidebarWidth } from "../hooks/use-sidebar-width.ts";
import { QuestionNavItem } from "./question-nav-item.tsx";

type Props = {
  state: SessionState;
  chatFor: string | null;
  unread: (q: Question) => number;
  onOpenChat: (id: string) => void;
};

/** Rounds and questions. Drag the right edge to resize; collapses to a strip of numbered status chips. */
export function AppSidebar({ state, chatFor, unread, onOpenChat }: Props) {
  const current = useQuestionInView(state);
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const [width, setWidth] = useSidebarWidth();
  useSidebarHotkey();

  const jump = (anchor: string) => {
    scrollToAnchor(anchor);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" aria-label="Rounds and questions">
      <SidebarHeader className="h-14 flex-row items-center border-b px-3 group-data-[collapsible=icon]:px-2">
        <BrandMark />
        <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">better grill</span>
      </SidebarHeader>

      <SidebarContent>
        {state.rounds.length === 0 && <SidebarEmpty ended={state.ended} />}

        {state.rounds.map((round) => {
          const questions = roundQuestions(state, round.questionIds);
          const live = liveQuestions(questions);
          const locked = live.filter((q) => q.status === "answered").length;
          return (
            <SidebarGroup key={round.number}>
              <SidebarGroupLabel
                render={<button type="button" onClick={() => jump(anchors.round(round.number))} />}
                className="gap-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:pointer-events-none"
              >
                <span className="font-semibold text-primary tabular-nums">{roundLabel(round.number)}</span>
                <span className="min-w-0 flex-1 truncate text-left">{round.title ?? `Round ${round.number}`}</span>
                <span className="tabular-nums">
                  {locked}/{live.length}
                </span>
              </SidebarGroupLabel>
              <p className="mb-1 hidden text-center text-[10px] font-semibold text-primary tabular-nums group-data-[collapsible=icon]:block">
                {roundLabel(round.number)}
              </p>
              <SidebarMenu className="gap-0.5">
                {questions.map((question) => (
                  <QuestionNavItem
                    key={question.id}
                    question={question}
                    active={current === question.id || chatFor === question.id}
                    unread={unread(question)}
                    onJump={() => jump(anchors.question(question.id))}
                    onOpenChat={() => onOpenChat(question.id)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}

        {state.summary && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Summary" onClick={() => jump(anchors.summary)} className="text-primary">
                  <ClipboardCheckIcon />
                  <span>Summary</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <SessionProgress state={state} />
      </SidebarFooter>
      {!isMobile && sidebarState === "expanded" && (
        <ResizeHandle
          side="left"
          cssVar="--app-sidebar-w"
          width={width}
          min={SIDEBAR_WIDTH.min}
          max={SIDEBAR_WIDTH.max}
          initial={SIDEBAR_WIDTH.initial}
          onResize={setWidth}
          label="Resize panel"
        />
      )}
    </Sidebar>
  );
}

function SessionProgress({ state }: { state: SessionState }) {
  const questions = liveQuestions(Object.values(state.questions));
  if (questions.length === 0) return null;
  const answered = questions.filter((q) => q.status === "answered").length;
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">Settled</span>
        <span className="text-muted-foreground tabular-nums">
          {answered}/{questions.length}
        </span>
      </div>
      <Progress
        value={(answered / questions.length) * 100}
        aria-label="Questions settled"
        // Orange while anything is open, green once all are settled.
        className={cn(answered === questions.length && "**:data-[slot=progress-indicator]:bg-success")}
      />
    </div>
  );
}

function SidebarEmpty({ ended }: { ended: boolean }) {
  return (
    <SidebarGroup>
      {!ended && (
        <SidebarMenu>
          {[0, 1, 2].map((i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
      <p className="px-2 pt-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        {ended ? "No rounds were posted." : "Rounds and questions show up here as Claude posts them."}
      </p>
    </SidebarGroup>
  );
}
