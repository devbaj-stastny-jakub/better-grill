import type { Question } from "@better-grill/protocol";
import { CheckIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  question: Question;
  selected: string[];
  disabled: boolean;
  onToggle: (optionId: string) => void;
};

/** Choice cards. Single-select still lets the user click a pick again to clear it. */
export function OptionList({ question, selected, disabled, onToggle }: Props) {
  const multi = question.multiSelect;
  return (
    <div role={multi ? "group" : "radiogroup"} className="grid gap-2">
      {question.options.map((option, index) => {
        const isSelected = selected.includes(option.id);
        const isRecommended = question.recommended === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onToggle(option.id)}
            data-answer-item
            data-option-id={option.id}
            className={cn(
              "group/option flex scroll-mt-20 scroll-mb-32 items-start gap-3 rounded-lg border bg-background p-3 text-left transition-[color,background-color,border-color,box-shadow] outline-none",
              "hover:bg-muted/50 focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
              "dark:bg-input/20 dark:hover:bg-input/40",
              isSelected && "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/5 dark:bg-primary/10 dark:hover:bg-primary/10",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center border text-[10px] font-medium text-muted-foreground transition-colors",
                multi ? "rounded-md" : "rounded-full",
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input group-hover/option:border-foreground/30",
              )}
            >
              {isSelected ? <CheckIcon className="size-3" strokeWidth={3} /> : String.fromCharCode(65 + index)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium">{option.label}</span>
                {isRecommended && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <SparklesIcon data-icon="inline-start" />
                    Recommended
                  </Badge>
                )}
              </span>
              {option.description && <span className="mt-0.5 block text-sm text-muted-foreground">{option.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
