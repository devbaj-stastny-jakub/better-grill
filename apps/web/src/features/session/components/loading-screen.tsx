import { BrandMark } from "@/components/brand.tsx";
import { SidebarMenuSkeleton } from "@/components/ui/sidebar.tsx";
import { WarmUp } from "./warm-up.tsx";

/**
 * First paint, before the bridge sends the session. Mirrors the empty session
 * screen (sidebar, header, the grill centred), so connecting swaps in without a jump.
 */
export function LoadingScreen() {
  return (
    <div className="flex min-h-svh" aria-busy>
      <div className="hidden w-80 shrink-0 p-3 md:flex">
        <aside className="flex flex-1 flex-col rounded-xl bg-sidebar shadow-md ring-1 ring-sidebar-border">
          <div className="flex h-12 items-center gap-2 border-b px-2">
            <BrandMark />
            <span className="text-sm font-semibold tracking-tight">better grill</span>
          </div>
          <div className="p-2">
            {[0, 1, 2].map((i) => (
              <SidebarMenuSkeleton key={i} showIcon />
            ))}
          </div>
        </aside>
      </div>
      <div className="flex min-w-0 flex-1 flex-col pt-3 pr-3">
        <header className="h-12 shrink-0 rounded-xl border bg-background/80 shadow-md" />
        <main className="grid flex-1 place-items-center px-4 pt-8 pb-[16svh]">
          <WarmUp stage="connecting" />
        </main>
      </div>
    </div>
  );
}
