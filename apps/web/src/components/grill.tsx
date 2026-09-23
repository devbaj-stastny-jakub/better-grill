import { useEffect, useRef, type SVGProps } from "react";
import { cn } from "@/lib/utils.ts";

/** Kettle grill in Lucide's style: grate, bowl, two legs. Never moves. */
const GRILL = ["M3 11h18", "M4 11a8 6 0 0 0 16 0", "M8 16.2 6.5 21", "M16 16.2 17.5 21"];

/**
 * One heat wave rising from the grate at `x`: two cubic bends ending at `top`.
 * `bend` 1 curves right-then-left, -1 mirrors it, 0 is straight. Every pose has
 * the same commands, so SMIL can morph between them.
 */
function wave(x: number, bend: number, top: number) {
  const b = 1.1 * bend;
  const mid = (8 + top) / 2;
  return (
    `M${x} 8 C${x + b} ${8 - (8 - mid) / 3} ${x + b} ${mid + (8 - mid) / 3} ${x} ${mid} ` +
    `C${x - b} ${mid - (mid - top) / 3} ${x - b} ${top + (mid - top) / 3} ${x} ${top}`
  );
}

/** Wave poses as [bend, top]. Each wave runs the cycle from its own offset, so they shimmer out of step. */
const POSES: [number, number][] = [
  [1, 3],
  [0.2, 2.6],
  [-1, 3],
  [-0.2, 3.4],
];
const WAVES = [8, 12, 16].map((x, offset) => {
  const cycle = [0, 1, 2, 3, 0].map((step) => {
    const [bend, top] = POSES[(step + offset) % POSES.length]!;
    return wave(x, bend, top);
  });
  return { rest: cycle[0]!, values: cycle.join(";") };
});
const KEY_TIMES = "0;0.25;0.5;0.75;1";
const EASE = Array(POSES.length).fill("0.45 0 0.55 1").join(";");

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Props = SVGProps<SVGSVGElement> & {
  /** Shimmer the heat waves. Off shows the still icon. */
  hot?: boolean;
};

/** Grill icon whose heat waves shimmer. Used as the loader and the logo. */
export function Grill({ hot = true, className, ...props }: Props) {
  const svg = useRef<SVGSVGElement>(null);

  // Start from the rest pose on every run, and snap back to it when stopped.
  useEffect(() => {
    for (const animation of svg.current?.querySelectorAll("animate") ?? []) {
      if (hot && !reducedMotion()) animation.beginElement();
      else animation.endElement();
    }
  }, [hot]);

  return (
    <svg
      ref={svg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-grill={hot ? "hot" : "still"}
      className={cn("size-4 shrink-0", className)}
      {...props}
    >
      {GRILL.map((d) => (
        <path key={d} d={d} />
      ))}
      {WAVES.map(({ rest, values }) => (
        <path key={rest} d={rest}>
          <animate
            attributeName="d"
            values={values}
            keyTimes={KEY_TIMES}
            keySplines={EASE}
            calcMode="spline"
            dur="1.6s"
            begin="indefinite"
            repeatCount="indefinite"
          />
        </path>
      ))}
    </svg>
  );
}
