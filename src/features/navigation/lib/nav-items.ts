import { CalendarHeart, LayoutGrid, Search, User } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  /** Also the next-intl key under the "nav" namespace. */
  id: "dashboard" | "events" | "search" | "profile";
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Phase 1 ships Dashboard only; the rest render disabled until built. */
  enabled: boolean;
}

export const navItems: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutGrid, enabled: true },
  { id: "events", href: "/events", icon: CalendarHeart, enabled: false },
  { id: "search", href: "/search", icon: Search, enabled: false },
  { id: "profile", href: "/profile", icon: User, enabled: false },
];
