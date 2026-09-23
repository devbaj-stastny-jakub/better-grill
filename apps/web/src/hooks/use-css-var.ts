import { useLayoutEffect } from "react";

/** Mirrors a value into a CSS custom property on <html>, before paint. */
export function useCssVar(name: string, value: string) {
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(name, value);
  }, [name, value]);
}
