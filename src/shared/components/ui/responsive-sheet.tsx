"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsDesktop } from "@/shared/hooks/use-media-query";

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * One container for every form in the app: a bottom drawer on phones, a
 * centred dialog on desktop.
 *
 * Not two components with duplicated form markup inside. A drawer is what a
 * phone user expects — thumb-reachable, swipe to dismiss, and it does not
 * fight the on-screen keyboard the way a vertically-centred dialog does. On a
 * wide screen the same drawer would be a strange full-width slab. The form
 * itself does not need to know which it is in.
 */
export function ResponsiveSheet({ open, onOpenChange, title, description, children, className }: ResponsiveSheetProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className ?? "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        {/*
          The drawer can exceed the viewport once the keyboard opens, so the
          body scrolls inside it rather than the page behind it.
        */}
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
