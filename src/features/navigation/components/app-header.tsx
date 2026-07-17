"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, Shield, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionQuery } from "@/features/auth";
import { useTelegramUser } from "@/features/telegram";
import { cn } from "@/lib/utils";

import { navItems } from "../lib/nav-items";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

export function AppHeader() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const telegramUser = useTelegramUser();
  const session = useSessionQuery();
  const { isSuperAdmin } = usePermissions();
  const sessionUser = session.data?.user;
  const user = telegramUser
    ? {
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
      }
    : {
        firstName: sessionUser?.firstName,
        lastName: sessionUser?.lastName,
        username: sessionUser?.username,
        photoUrl: sessionUser?.photoUrl,
      };

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Local Admin";
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim().toUpperCase() || "U";
  const visibleItems = navItems.filter((item) => !item.superAdminOnly || isSuperAdmin);
  const currentItem = visibleItems.find((item) => pathname === item.href);

  return (
    <header className="glass-panel sticky top-0 z-30 flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-8">
        <Link href="/dashboard" className="text-foreground flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl text-sm">
            WR
          </span>
          <span className="hidden sm:inline">{tCommon("appName")}</span>
        </Link>

        {currentItem ? (
          <span className="text-foreground truncate text-sm font-semibold sm:hidden">{t(currentItem.id)}</span>
        ) : null}

        <nav className="hidden items-center gap-1 sm:flex">
          {visibleItems.map((item) => {
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

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <div className="hidden items-center gap-1 sm:flex">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="ml-0.5 rounded-full sm:ml-1" aria-label="Open profile" />
            }
          >
            <Avatar className="size-8">
              <AvatarImage src={user.photoUrl} alt={displayName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="text-foreground block truncate text-sm font-semibold">{displayName}</span>
              <span className="block truncate">@{user.username ?? "local_admin"}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profile" />}>
              <User className="mr-2 size-4" />
              {t("profile")}
            </DropdownMenuItem>
            {isSuperAdmin ? (
              <>
                <DropdownMenuItem render={<Link href="/admin" />}>
                  <Shield className="mr-2 size-4" />
                  {t("admin")}
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/admin/settings" />}>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<a href="/api/auth/logout" />}>
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
