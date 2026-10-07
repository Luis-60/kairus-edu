"use client";

import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: "left" | "right";
  dark?: boolean;
  className?: string;
  children: ReactNode;
};

/** Painel lateral modal (drawer). Usado para a navegação no mobile e formulários. */
export function Sheet({ open, onOpenChange, title, description, side = "right", dark, className, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 z-50 flex w-full max-w-110 flex-col overflow-y-auto shadow-raised focus:outline-none",
            dark ? "bg-navy text-white" : "bg-surface text-navy",
            side === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          <div className={cn("flex items-start justify-between gap-4 border-b px-5 py-4", dark ? "border-white/10" : "border-line")}>
            <div className="min-w-0">
              <Dialog.Title className="text-lg leading-7 font-bold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-[13px] leading-5 text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className={cn(
                "min-h-9 rounded-control px-2 text-[13px] font-semibold",
                dark ? "text-sidebar-text hover:text-white" : "text-primary hover:text-primary-hover",
              )}
            >
              Fechar
            </Dialog.Close>
          </div>
          <div className="flex-1 px-5 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
