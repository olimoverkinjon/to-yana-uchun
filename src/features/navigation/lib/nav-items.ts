import { CalendarHeart, LayoutGrid, Search, User } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  /** Also the next-intl key under the "nav" namespace. */
  id: "dashboard" | "events" | "search" | "profile";
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Renders disabled until the destination exists. */
  enabled: boolean;
}

export const navItems: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutGrid, enabled: true },
  { id: "events", href: "/events", icon: CalendarHeart, enabled: true },
  { id: "search", href: "/search", icon: Search, enabled: true },
  // Profile is not built yet; shown disabled rather than hidden so the tab bar
  // does not reflow once it lands.
  { id: "profile", href: "/profile", icon: User, enabled: false },
];
