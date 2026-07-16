"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * The "nothing here" state. Deliberately not a bare line of grey text:
 * an empty list is where a first-time user most needs to be told what to do
 * next, so callers pass the action that fills it.
 */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}
    >
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
        <Icon className="size-5.5" />
      </span>
      <div className="space-y-1">
        <p className="text-foreground text-base font-medium">{title}</p>
        {body ? <p className="text-muted-foreground mx-auto max-w-xs text-sm">{body}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </motion.div>
  );
}
