import { Spinner } from "@/components/ui/spinner.tsx";

/** Button label that swaps to a spinner and pending text while an action runs. */
export function PendingLabel({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  if (!pending) return <>{label}</>;
  return (
    <>
      <Spinner data-icon="inline-start" />
      {pendingLabel}
    </>
  );
}
