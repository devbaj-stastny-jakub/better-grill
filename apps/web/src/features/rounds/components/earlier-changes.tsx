import type { ReactNode } from "react";
import { HistoryIcon } from "lucide-react";

/** Closes the latest round's review: answers changed in earlier rounds, which go out with this Send. */
export function EarlierChanges({ children }: { children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          <HistoryIcon className="size-3.5" />
          Also sending
        </p>
        <h3 className="mt-0.5 text-lg font-semibold tracking-tight">Changed from earlier rounds</h3>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
