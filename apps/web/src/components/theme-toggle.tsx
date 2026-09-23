import { MoonIcon, SunIcon } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar.tsx";
import { useTheme } from "@/lib/theme.tsx";

/** Sidebar menu row (goes in a SidebarMenu); collapses to its icon with the label as tooltip. */
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Dark theme" : "Light theme";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={label} onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`}>
        {next === "dark" ? <MoonIcon /> : <SunIcon />}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
