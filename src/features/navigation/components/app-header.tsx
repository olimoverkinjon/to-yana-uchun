"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTelegramUser } from "@/features/telegram";
import { cn } from "@/lib/utils";

import { navItems } from "../lib/nav-items";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

export function AppHeader() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const user = useTelegramUser();

  const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.trim().toUpperCase() || "U" : "U";

  return (
    <header className="glass-panel sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-foreground flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl text-sm">
            WR
          </span>
          <span className="hidden sm:inline">{tCommon("appName")}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.enabled ? item.href : "#"}
                aria-disabled={!item.enabled}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive && "bg-accent text-accent-foreground",
                  !isActive && item.enabled && "text-muted-foreground hover:text-foreground",
                  !item.enabled && "text-muted-foreground/40 cursor-default",
                )}
              >
                {t(item.id)}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <Avatar className="ml-1 size-8">
          <AvatarImage src={user?.photo_url} alt={user?.first_name ?? ""} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
