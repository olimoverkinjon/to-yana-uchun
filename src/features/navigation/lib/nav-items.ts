import { CalendarHeart, Gift, LayoutGrid, Search, Shield, User } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  /** Also the next-intl key under the "nav" namespace. */
  id: "dashboard" | "events" | "myGifts" | "search" | "profile" | "admin";
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Renders disabled until the destination exists. */
  enabled: boolean;
  superAdminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutGrid, enabled: true },
  { id: "events", href: "/events", icon: CalendarHeart, enabled: true },
  { id: "myGifts", href: "/my-gifts", icon: Gift, enabled: true },
  { id: "search", href: "/search", icon: Search, enabled: true },
  { id: "admin", href: "/admin", icon: Shield, enabled: true, superAdminOnly: true },
  { id: "profile", href: "/profile", icon: User, enabled: true },
];
