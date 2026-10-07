import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type PanelProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  flat?: boolean;
};

/** Bloco de conteúdo padrão (equivalente às seções brancas do protótipo). */
export function Panel({ title, description, actions, flat, className, children, ...props }: PanelProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-card border border-line bg-surface p-5 sm:p-6",
        !flat && "shadow-card",
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-lg leading-7 font-bold">{title}</h2>}
            {description && <p className="text-[13px] leading-5 text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

type KpiProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  dark?: boolean;
  /** Variante sem borda/sombra para uso dentro de um painel (evita card dentro de card). */
  subtle?: boolean;
  valueClassName?: string;
};

export function KpiCard({ label, value, hint, dark, subtle, valueClassName }: KpiProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-card p-4 sm:p-5",
        dark ? "bg-navy text-white" : subtle ? "bg-canvas" : "border border-line bg-surface shadow-card",
      )}
    >
      <div className={cn("label-caps", dark ? "text-sidebar-text" : "text-muted")}>{label}</div>
      <div className={cn("tabular text-[26px] leading-8 font-extrabold tracking-[-0.02em] sm:text-[32px] sm:leading-10", valueClassName)}>
        {value}
      </div>
      {hint && <div className={cn("text-[13px] leading-5", dark ? "text-sidebar-text" : "text-muted")}>{hint}</div>}
    </div>
  );
}

type PageHeaderProps = { eyebrow?: ReactNode; title: string; actions?: ReactNode };

export function PageHeader({ eyebrow, title, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="text-[13px] leading-5 text-muted">{eyebrow}</div>}
        <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.015em]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
