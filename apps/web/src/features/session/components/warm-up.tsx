import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Grill } from "@/components/grill.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { STORAGE_KEYS } from "@/config/constants.ts";
import { useNow } from "@/hooks/use-now.ts";
import { cn } from "@/lib/utils.ts";
import { formatElapsed } from "@/utils/format.ts";

export type WarmUpStage = "connecting" | "reading";

/**
 * The log lines, in order. A line shows up once its stage is reached. The last one never
 * finishes here: the first round replaces the whole screen.
 */
const STAGES: { stage: WarmUpStage; active: string; done?: string }[] = [
  { stage: "connecting", active: "Connecting to your session", done: "Connected to your session" },
  { stage: "reading", active: "Claude is reading your request" },
];

type Reached = Partial<Record<WarmUpStage, number>>;

/**
 * When each stage was first seen. Module state, so the log survives the switch from the
 * loading screen to the session screen; connecting starts at page load. Once the session
 * is known, `remember` merges it with earlier page loads, so a reload keeps the real times.
 */
const reached: Reached = { connecting: performance.timeOrigin };

let remembered = "";

/**
 * Merges `reached` with what earlier loads of this session saw (earliest wins) and stores it,
 * once per session and stage. Only the latest session is kept.
 */
function remember(session: number, stage: WarmUpStage) {
  if (remembered === `${session}:${stage}`) return;
  remembered = `${session}:${stage}`;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.warmUp) ?? "null") as {
      session: number;
      reached: Reached;
    } | null;
    if (stored?.session === session) {
      for (const [stage, at] of Object.entries(stored.reached) as [WarmUpStage, number][]) {
        reached[stage] = Math.min(reached[stage] ?? at, at);
      }
    }
    localStorage.setItem(STORAGE_KEYS.warmUp, JSON.stringify({ session, reached }));
  } catch {
    // private mode or blocked storage: this page load's times only
  }
}

/**
 * Coals in the bowl, in the grill's 24×24 space: three flat chunks with small gaps
 * between them, like the icon's own lines. They light left to right.
 */
const COALS = [
  "M4.5 14Q6.7 11.8 8.7 13.1V17H4.5Z",
  "M9.3 13.1Q12 11.1 14.7 13.1V17H9.3Z",
  "M15.3 13.1Q17.3 11.8 19.5 14V17H15.3Z",
];

/** Inside of the bowl, so the coals pile up in it rather than float. */
const BOWL = "M4.5 11a7.5 5.5 0 0 0 15 0Z";

/** Sparks rising off the grate: left offset (%), sideways drift (px), duration (s), delay (s). */
const EMBERS = [
  [34, -10, 2.6, 0],
  [46, 8, 2.2, 0.7],
  [58, -6, 2.9, 1.3],
  [66, 12, 2.4, 0.3],
  [40, 14, 3.1, 1.9],
  [52, -14, 2.7, 2.4],
  [30, 6, 2.3, 1.6],
  [62, -10, 3.3, 0.9],
] as const;

/** Time the coals take to catch before the heat starts to shimmer. */
const LIGHT_UP_MS = 900;

/** The grill lights once per page load; later mounts (connect, then waiting) pick up already hot. */
let lit = false;

type Props = {
  stage: WarmUpStage;
  /** The session's `startedAt`, once known: keys the stored stage times. */
  session?: number;
  className?: string;
};

/** First impression: the grill lights up while the session connects and Claude prepares the first round. */
export function WarmUp({ stage, session, className }: Props) {
  const [intro] = useState(() => !lit);
  const [hot, setHot] = useState(lit);

  useEffect(() => {
    lit = true;
    if (hot) return;
    const timer = setTimeout(() => setHot(true), LIGHT_UP_MS);
    return () => clearTimeout(timer);
  }, [hot]);

  reached[stage] ??= Date.now();
  // In render, not an effect, so the first paint after a reload already shows the stored times.
  if (session !== undefined) remember(session, stage);
  const active = STAGES.findIndex((s) => s.stage === stage);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center text-center",
        intro && "animate-in fill-mode-both fade-in-0 zoom-in-95 animation-duration-700",
        className,
      )}
    >
      <div className="relative size-40">
        <div aria-hidden className={cn("absolute -inset-8 transition-opacity duration-1000", hot ? "opacity-100" : "opacity-0")}>
          <div className="size-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_28%,transparent),transparent)] motion-safe:animate-glow" />
        </div>
        <div aria-hidden className="absolute inset-x-0 top-[18%] h-[30%] motion-reduce:hidden">
          {hot &&
            EMBERS.map(([left, drift, duration, delay]) => (
              <span
                key={left}
                className="absolute bottom-0 size-1 rounded-full bg-primary animate-ember"
                style={
                  {
                    left: `${left}%`,
                    "--ember-drift": `${drift}px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
        </div>
        <svg aria-hidden viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible">
          <clipPath id="warm-up-bowl">
            <path d={BOWL} />
          </clipPath>
          <g clipPath="url(#warm-up-bowl)">
            {COALS.map((d, i) => (
              <path
                key={d}
                d={d}
                className="fill-primary"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "bottom",
                  animation: [
                    intro && `ignite 500ms ease-out ${150 + i * 200}ms both`,
                    `flicker ${2 + i * 0.4}s ease-in-out ${intro ? 700 + i * 200 : 0}ms infinite`,
                  ]
                    .filter(Boolean)
                    .join(", "),
                }}
              />
            ))}
          </g>
        </svg>
        <Grill hot={hot} strokeWidth={1.1} className="absolute inset-0 size-full text-foreground" />
      </div>

      <h2 className="mt-2 text-xl font-semibold tracking-tight">Firing up the grill</h2>

      <div className="mt-6 w-full max-w-md overflow-hidden rounded-xl border bg-card text-left shadow-sm">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-border" />
          ))}
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">better-grill</span>
        </div>
        {/* Room for every line up front, so the grill above stays put as lines arrive. */}
        <ol className="min-h-[4.375rem] space-y-1.5 px-3.5 py-3 font-mono text-xs">
          {STAGES.slice(0, active + 1).map(({ stage: step, ...line }, i) => {
            const at = reached[step];
            if (at === undefined) return null;
            const next = STAGES.slice(i + 1, active + 1).find((s) => reached[s.stage] !== undefined);
            const doneAt = next && reached[next.stage];
            return (
              <li
                key={step}
                className="flex min-h-5 items-center gap-3 animate-in fill-mode-both fade-in-0 slide-in-from-bottom-1 animation-duration-300"
              >
                <time className="shrink-0 text-muted-foreground/70 tabular-nums">{clock(at)}</time>
                {doneAt === undefined ? (
                  <>
                    <Spinner className="size-3 text-primary" />
                    <span className="min-w-0 flex-1 text-foreground">
                      {line.active}
                      <span className="ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-primary motion-safe:animate-blink" />
                    </span>
                    <Elapsed since={at} />
                  </>
                ) : (
                  <>
                    <CheckIcon className="size-3 shrink-0 text-success" />
                    <span className="min-w-0 flex-1 text-muted-foreground">{line.done}</span>
                    <span className="shrink-0 text-muted-foreground/70 tabular-nums">{formatElapsed(doneAt - at)}</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Elapsed({ since }: { since: number }) {
  const now = useNow();
  return (
    <Badge variant="outline" className="text-muted-foreground tabular-nums">
      {formatElapsed(now - since)}
    </Badge>
  );
}

const clock = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
