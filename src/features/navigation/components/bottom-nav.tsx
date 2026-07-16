"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

import { navItems } from "../lib/nav-items";

/** Mobile tab bar. Hidden on `sm:` and up, where AppHeader's nav takes over. */
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="glass-panel fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-2xl px-2 py-2 sm:hidden">
      {navItems.map((item) => {
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
              "flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
              isActive && "text-primary",
              !isActive && item.enabled && "text-muted-foreground hover:text-foreground",
              !item.enabled && "text-muted-foreground/40",
            )}
          >
            <Icon className="size-5" strokeWidth={isActive ? 2.4 : 2} />
            {t(item.id)}
          </Link>
        );
      })}
    </nav>
  );
}
