"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { usePermissions } from "@/features/auth";

import { navItems } from "../lib/nav-items";

/** Mobile tab bar. Hidden on `sm:` and up, where AppHeader's nav takes over. */
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { isSuperAdmin } = usePermissions();
  const visibleItems = navItems.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <nav
      className={cn(
        "glass-panel fixed inset-x-2 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-40 grid items-center rounded-2xl px-1.5 py-1.5 sm:hidden",
        visibleItems.length <= 4 ? "grid-cols-4" : "grid-cols-5",
      )}
    >
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        function handleClick(event: MouseEvent<HTMLAnchorElement>) {
          if (!item.enabled) event.preventDefault();
        }

        return (
          <Link
            key={item.id}
            href={item.enabled ? item.href : "#"}
            aria-disabled={!item.enabled}
            aria-current={isActive ? "page" : undefined}
            onClick={handleClick}
            className={cn(
              "flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] leading-none font-medium transition-colors",
              isActive && "text-primary",
              !isActive && item.enabled && "text-muted-foreground hover:text-foreground",
              !item.enabled && "text-muted-foreground/40",
            )}
          >
            <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
            <span className="max-w-full truncate">{t(item.id)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
