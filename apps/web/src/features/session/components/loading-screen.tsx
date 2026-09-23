import { BrandMark } from "@/components/brand.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

/** First paint, before the bridge sends the session. Skeleton of the real layout. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-svh bg-background" aria-busy>
      <aside className="hidden w-80 shrink-0 flex-col gap-3 border-r bg-sidebar p-3 md:flex">
        <div className="flex items-center gap-2.5 p-1">
          <BrandMark />
          <Skeleton className="h-4 w-28" />
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8" style={{ opacity: 1 - i * 0.25 }} />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <Skeleton className="h-4 w-48" />
          <div className="flex-1" />
          <Badge variant="outline" className="h-6 gap-2 px-2.5 text-muted-foreground">
            <Spinner className="size-3" />
            Connecting
          </Badge>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-8">
          <Skeleton className="mb-6 h-6 w-56" />
          <div className="space-y-4 rounded-xl p-6 ring-1 ring-foreground/10">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        </main>
      </div>
    </div>
  );
}
