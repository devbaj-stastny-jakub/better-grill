import { BrandMark } from "@/components/brand.tsx";
import { SidebarMenuSkeleton } from "@/components/ui/sidebar.tsx";
import { WarmUp } from "./warm-up.tsx";

/**
 * First paint, before the bridge sends the session. Mirrors the empty session
 * screen (sidebar, header, the grill centred), so connecting swaps in without a jump.
 */
export function LoadingScreen() {
  return (
    <div className="flex min-h-svh bg-background" aria-busy>
      <aside className="hidden w-80 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <BrandMark />
          <span className="text-sm font-semibold tracking-tight">better grill</span>
        </div>
        <div className="p-2">
          {[0, 1, 2].map((i) => (
            <SidebarMenuSkeleton key={i} showIcon />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-14 shrink-0 border-b" />
        <main className="grid flex-1 place-items-center px-4 pt-8 pb-[16svh]">
          <WarmUp stage="connecting" />
        </main>
      </div>
    </div>
  );
}
