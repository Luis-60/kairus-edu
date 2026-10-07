import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-dashed border-line bg-canvas p-6">
      <p className="font-bold">{title}</p>
      {children && <div className="text-[13px] leading-5 text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Não foi possível carregar estes dados.", action }: { title?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-card bg-danger-bg p-6 text-danger">
      <p className="font-bold">{title}</p>
      <p className="text-[13px] leading-5">Tente novamente. Se o problema continuar, avise o suporte da sua instituição.</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-control bg-line/60", className)} />;
}

/** Barra horizontal fina com preenchimento proporcional (0–100). */
export function Meter({ value, fillClassName = "bg-primary", trackClassName = "bg-tint", className }: {
  value: number;
  fillClassName?: string;
  trackClassName?: string;
  className?: string;
}) {
  const largura = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full", trackClassName, className)}>
      <div className={cn("h-full rounded-full", fillClassName)} style={{ width: `${largura}%` }} />
    </div>
  );
}
