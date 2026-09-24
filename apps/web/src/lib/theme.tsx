import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { STORAGE_KEYS } from "@/config/constants.ts";
import { usePersistentState } from "@/hooks/use-persistent-state.ts";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = { theme: Theme; resolved: "light" | "dark"; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Puts `.dark` on <html>. index.html applies the stored choice before first paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>(STORAGE_KEYS.theme, "system");
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);

  useEffect(() => {
    const query = darkQuery();
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  // Layout effect: set before any child's effect reads the theme's CSS variables.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider.");
  return context;
}
