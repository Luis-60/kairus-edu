import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Database } from "@/types/database";

export type Tone = "neutral" | "info" | "ok" | "warn" | "danger" | "strong";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-muted",
  info: "bg-tint text-primary",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  strong: "bg-primary text-white",
};

export function Badge({ tone = "neutral", dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[13px] leading-5 font-bold whitespace-nowrap",
        tones[tone],
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

type Faixa = Database["public"]["Enums"]["faixa_risco"];

export const FAIXA: Record<Faixa, { label: string; tone: Tone; fill: string }> = {
  baixo: { label: "Baixo risco", tone: "ok", fill: "bg-ok" },
  atencao: { label: "Atenção", tone: "warn", fill: "bg-warn-fill" },
  alto: { label: "Alto risco", tone: "danger", fill: "bg-danger" },
};

export function RiskBadge({ faixa }: { faixa: Faixa | null }) {
  if (!faixa) return <Badge>Sem avaliação</Badge>;
  return (
    <Badge tone={FAIXA[faixa].tone} dot>
      {FAIXA[faixa].label}
    </Badge>
  );
}
