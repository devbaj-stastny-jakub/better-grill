import { Fragment, useState } from "react";
import type { Question, SessionState } from "@better-grill/protocol";
import { ClipboardCheckIcon } from "lucide-react";
import { BrandMark } from "@/components/brand.tsx";
import { ResizeHandle } from "@/components/resize-handle.tsx";
import { ThemeToggle } from "@/components/theme-toggle.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { liveQuestions, roundQuestions } from "@/utils/question.ts";
import { anchors } from "@/utils/anchors.ts";
import { useSidebarHotkey } from "../hooks/use-sidebar-hotkey.ts";
import { SIDEBAR_WIDTH, useSidebarWidth } from "../hooks/use-sidebar-width.ts";
import { ProgressRing } from "./progress-ring.tsx";
import { RoundNavGroup } from "./round-nav-group.tsx";

type Props = {
  state: SessionState;
  /** Anchor id of the step on screen. */
  current: string | null;
  /** Show a step, by its anchor id. */
  onJump: (anchor: string) => void;
  chatFor: string | null;
  unread: (q: Question) => number;
  onOpenChat: (id: string) => void;
};

/** Rounds and questions; a click shows that step. Settled rounds turn green and fold away. Drag the right edge to resize; collapses to a strip of numbered status chips. */
export function AppSidebar({ state, current, onJump, chatFor, unread, onOpenChat }: Props) {
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const [width, setWidth] = useSidebarWidth();
  // Rounds the user folded or unfolded by hand; the rest follow RoundNavGroup's default.
  const [toggled, setToggled] = useState<Record<number, boolean | undefined>>({});
  useSidebarHotkey();

  const jump = (anchor: string) => {
    onJump(anchor);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar variant="floating" collapsible="icon" aria-label="Rounds and questions">
      <SidebarHeader className="h-12 flex-row items-center border-b px-2">
        <BrandMark />
        <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">better grill</span>
      </SidebarHeader>

      {/* shadcn clips the content when collapsed; long sessions need the chip strip to scroll. */}
      <SidebarContent className="group-data-[collapsible=icon]:overflow-x-hidden group-data-[collapsible=icon]:overflow-y-auto">
        {state.rounds.length === 0 && <SidebarEmpty ended={state.ended} />}

        {state.rounds.map((round, i) => (
          <Fragment key={round.number}>
            {i > 0 && <SidebarSeparator />}
            <RoundNavGroup
              round={round}
              questions={roundQuestions(state, round.questionIds)}
              current={current}
              chatFor={chatFor}
              unread={unread}
              onJump={jump}
              onOpenChat={onOpenChat}
              toggled={toggled[round.number]}
              onToggle={(open) => setToggled((now) => ({ ...now, [round.number]: open }))}
            />
          </Fragment>
        ))}

        {state.summary && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Summary"
                  isActive={current === anchors.summary}
                  onClick={() => jump(anchors.summary)}
                  className="text-primary hover:text-primary data-active:text-primary"
                >
                  <ClipboardCheckIcon />
                  <span>Summary</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu className="gap-0.5">
          <SessionProgress state={state} onJump={jump} />
          <ThemeToggle />
        </SidebarMenu>
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
          // Sit in the gap right of the panel.
          className="right-0"
        />
      )}
    </Sidebar>
  );
}

/** Settled count as a menu row: ring, label and count; just the ring when collapsed. Jumps to the next open question, or the summary. */
function SessionProgress({ state, onJump }: { state: SessionState; onJump: (anchor: string) => void }) {
  const questions = liveQuestions(Object.values(state.questions));
  if (questions.length === 0) return null;
  const settled = questions.filter((q) => q.status === "answered").length;
  const done = settled === questions.length;
  const next = questions.find((q) => q.status === "open");
  const target = next ? anchors.question(next.id) : state.summary ? anchors.summary : null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={`${settled}/${questions.length} settled`}
        disabled={!target}
        onClick={() => target && onJump(target)}
        aria-label={`${settled} of ${questions.length} settled`}
      >
        {/* Orange while anything is open, green once all are settled. */}
        <ProgressRing value={settled / questions.length} className={done ? "text-success" : "text-primary"} />
        {/* One span, so it shrinks away with the sidebar like other rows' labels. */}
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate">{done ? "All settled" : "Settled"}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {settled}/{questions.length}
          </span>
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarEmpty({ ended }: { ended: boolean }) {
  return (
    <SidebarGroup>
      {ended ? (
        <p className="px-2 pt-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No rounds were posted.</p>
      ) : (
        <SidebarMenu>
          {[0, 1, 2].map((i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
}
