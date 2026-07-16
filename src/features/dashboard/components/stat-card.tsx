"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  secondaryLines?: string[];
  index?: number;
}

export function StatCard({ icon: Icon, label, value, secondaryLines, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="glass-panel gap-0 border-0 py-0 ring-0">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">{label}</span>
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
              <Icon className="size-4.5" />
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-foreground text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            {secondaryLines?.map((line) => (
              <p key={line} className="text-muted-foreground text-xs tabular-nums">
                {line}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
