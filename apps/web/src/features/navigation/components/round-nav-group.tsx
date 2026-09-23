import type { Question, Round } from "@better-grill/protocol";
import { ChevronRightIcon, CircleCheckIcon, CircleDashedIcon, ScanEyeIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { roundLabel } from "@/utils/format.ts";
import { liveQuestions } from "@/utils/question.ts";
import { anchors } from "@/utils/anchors.ts";
import { QuestionNavItem } from "./question-nav-item.tsx";

type Props = {
  round: Round;
  questions: Question[];
  /** Anchor id of the step on screen. */
  current: string | null;
  chatFor: string | null;
  unread: (q: Question) => number;
  /** Show a step, by its anchor id. */
  onJump: (anchor: string) => void;
  onOpenChat: (id: string) => void;
  /** Open or closed by the user; `undefined` follows the default. */
  toggled: boolean | undefined;
  onToggle: (open: boolean | undefined) => void;
};

/**
 * One round in the sidebar. The title folds it; a settled round (every live question
 * answered) turns green, folds by default unless its step is on screen, and gets a
 * Review item. Collapsed sidebar: its number, then its chips, or one status icon when folded.
 */
export function RoundNavGroup({ round, questions, current, chatFor, unread, onJump, onOpenChat, toggled, onToggle }: Props) {
  const live = liveQuestions(questions);
  const locked = live.filter((q) => q.status === "answered").length;
  const settled = live.length > 0 && locked === live.length;
  const review = anchors.round(round.number);
  const onScreen = current === review || round.questionIds.some((id) => current === anchors.question(id));
  const open = toggled ?? (!settled || onScreen);
  const title = round.title ?? `Round ${round.number}`;

  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <SidebarGroup>
        <SidebarGroupLabel
          render={<CollapsibleTrigger />}
          // mb-1: a little air between its hover and the first question's.
          className="mb-1 gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:pointer-events-none"
        >
          <span className={cn("font-semibold tabular-nums", settled ? "text-success" : "text-primary")}>
            {roundLabel(round.number)}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{title}</span>
          <span className={cn("flex items-center gap-1 tabular-nums", settled && "text-success")}>
            {settled && <CircleCheckIcon className="size-3.5" />}
            {locked}/{live.length}
          </span>
          <ChevronRightIcon className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
        </SidebarGroupLabel>

        {/* Collapsed sidebar: the round's number stands in for its title. */}
        <p
          className={cn(
            "mb-1 hidden text-center text-[10px] font-semibold tabular-nums group-data-[collapsible=icon]:block",
            settled ? "text-success" : "text-primary",
          )}
        >
          {roundLabel(round.number)}
        </p>
        {!open && (
          // Collapsed sidebar, folded round: one icon. Settled goes to the review (which unfolds it); else it unfolds.
          <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={`${title} · ${locked}/${live.length} settled`}
                onClick={() => {
                  if (!settled) return onToggle(true);
                  onToggle(undefined);
                  onJump(review);
                }}
                className={settled ? "text-success hover:text-success" : "text-primary hover:text-primary"}
              >
                {settled ? <CircleCheckIcon /> : <CircleDashedIcon />}
                <span>{title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
          <SidebarMenu className="gap-0.5">
            {questions.map((question) => (
              <QuestionNavItem
                key={question.id}
                question={question}
                active={current === anchors.question(question.id) || chatFor === question.id}
                unread={unread(question)}
                onJump={() => onJump(anchors.question(question.id))}
                onOpenChat={() => onOpenChat(question.id)}
              />
            ))}
            {/* The round's review, once everything in it is settled. Works collapsed too, as its icon. */}
            {settled && (
              <SidebarMenuItem className="animate-in fade-in-0 slide-in-from-top-1 animation-duration-200">
                <SidebarMenuButton
                  tooltip={`Round ${roundLabel(round.number)} review`}
                  isActive={current === review}
                  onClick={() => onJump(review)}
                  className="text-primary hover:text-primary data-active:text-primary"
                >
                  <ScanEyeIcon />
                  <span>Review</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
