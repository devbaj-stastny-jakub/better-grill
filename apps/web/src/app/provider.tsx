import type { ReactNode } from "react";
import { CrashScreen } from "@/components/errors/crash-screen.tsx";
import { ErrorBoundary } from "@/components/errors/error-boundary.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { ThemeProvider } from "@/lib/theme.tsx";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ErrorBoundary fallback={(error) => <CrashScreen error={error} />}>
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
