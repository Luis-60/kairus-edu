import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Aba = { href: string; label: ReactNode; ativa: boolean };

/** Abas por URL, no estilo do seletor segmentado do protótipo. */
export function LinkTabs({ abas, rotulo }: { abas: Aba[]; rotulo: string }) {
  return (
    <nav aria-label={rotulo} className="inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-card border border-line bg-canvas p-1">
      {abas.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          aria-current={a.ativa ? "page" : undefined}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-control px-4 text-[13px] leading-5 font-semibold whitespace-nowrap",
            a.ativa ? "bg-surface text-primary shadow-card" : "text-muted hover:text-primary",
          )}
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
