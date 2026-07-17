"use client";

import { Laptop, Moon, Send, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const options = [
  { value: "telegram", Icon: Send },
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Laptop },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  // Avoids a hydration mismatch: next-themes only knows the real theme
  // client-side, so the trigger icon renders a neutral placeholder on
  // the server and swaps in after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ActiveIcon = options.find((o) => o.value === theme)?.Icon ?? Send;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Change theme" />}>
        {mounted ? <ActiveIcon className="size-4.5" /> : <span className="size-4.5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(({ value, Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(value === theme && "text-primary font-semibold")}
          >
            <Icon className="mr-2 size-4" />
            {t(value)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
