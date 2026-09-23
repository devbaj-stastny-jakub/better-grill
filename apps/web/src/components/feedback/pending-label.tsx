import { Coals } from "@/components/feedback/coals.tsx";

/** Button label that swaps to glowing coals and pending text while an action runs. */
export function PendingLabel({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  if (!pending) return <>{label}</>;
  return (
    <>
      <Coals />
      {pendingLabel}
    </>
  );
}
