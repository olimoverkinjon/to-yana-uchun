"use client";

import { CalendarHeart, Gift, Search, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

type CommandItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "user" | "event" | "gift" | "setting";
};

const icons = {
  user: User,
  event: CalendarHeart,
  gift: Gift,
  setting: Settings,
};

function cleanSearch(value: string) {
  return value
    .trim()
    .replace(/[\\%_]/g, "\\$&")
    .replace(/[,().*:"']/g, " ");
}

export function CommandPalette() {
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CommandItem[]>([]);
  const [pending, startTransition] = useTransition();

  const debouncedSearch = useDebouncedValue(search, 180);
  const query = useMemo(() => cleanSearch(debouncedSearch), [debouncedSearch]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    startTransition(async () => {
      if (query.length < 2) {
        setItems([]);
        return;
      }

      const telegramId = Number(query);
      const [users, events, gifts, settings] = await Promise.all([
        isSuperAdmin
          ? supabase
              .from("profiles")
              .select("id, username, first_name, last_name, telegram_id")
              .or(
                `username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,telegram_id.eq.${
                  Number.isFinite(telegramId) ? telegramId : -1
                }`,
              )
              .limit(5)
          : Promise.resolve({ data: [] }),
        supabase.from("event_summaries").select("id, title, event_date").ilike("title", `%${query}%`).limit(5),
        supabase
          .from("gifts")
          .select("id, event_id, giver_name, description")
          .or(`giver_name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5),
        isSuperAdmin
          ? supabase.from("settings").select("key, description").ilike("key", `%${query}%`).limit(5)
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;

      setItems([
        ...((users.data ?? []).map((user) => ({
          id: user.id,
          title:
            [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || String(user.telegram_id),
          subtitle: `User - ${user.username ? `@${user.username}` : user.telegram_id}`,
          href: `/admin/users/${user.id}`,
          type: "user" as const,
        })) ?? []),
        ...(events.data ?? []).flatMap((event) =>
          event.id && event.title
            ? [
                {
                  id: event.id,
                  title: event.title,
                  subtitle: `Event - ${event.event_date ?? "No date"}`,
                  href: `/events/${event.id}`,
                  type: "event" as const,
                },
              ]
            : [],
        ),
        ...((gifts.data ?? []).map((gift) => ({
          id: gift.id,
          title: gift.giver_name,
          subtitle: `Gift - ${gift.description ?? "No description"}`,
          href: `/events/${gift.event_id}`,
          type: "gift" as const,
        })) ?? []),
        ...((settings.data ?? []).map((setting) => ({
          id: setting.key,
          title: setting.key,
          subtitle: `Setting - ${setting.description ?? "Configuration"}`,
          href: `/admin/settings?search=${encodeURIComponent(setting.key)}`,
          type: "setting" as const,
        })) ?? []),
      ]);
    });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, query]);

  function go(href: string) {
    setOpen(false);
    setSearch("");
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0" showCloseButton={false}>
        <DialogHeader className="border-b p-3">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground size-4" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isSuperAdmin ? "Search users, events, gifts, settings" : "Search events and gifts"}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto p-2">
          {pending ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-11/12" />
              <Skeleton className="h-10 w-4/5" />
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = icons[item.type];
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => go(item.href)}
                    className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                  >
                    <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="text-muted-foreground block truncate text-xs">{item.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium">
                {query.length < 2 ? "Type at least 2 characters" : "No results found"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Ctrl+K or Cmd+K opens this from anywhere.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
