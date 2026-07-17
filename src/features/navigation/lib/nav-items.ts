import { CalendarHeart, LayoutGrid, Search, Shield, User } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  /** Also the next-intl key under the "nav" namespace. */
  id: "dashboard" | "events" | "search" | "profile" | "admin";
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Renders disabled until the destination exists. */
  enabled: boolean;
}

export const navItems: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutGrid, enabled: true },
  { id: "events", href: "/events", icon: CalendarHeart, enabled: true },
  { id: "search", href: "/search", icon: Search, enabled: true },
  { id: "admin", href: "/admin", icon: Shield, enabled: true },
  { id: "profile", href: "/profile", icon: User, enabled: true },
];
