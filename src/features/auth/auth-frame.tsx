import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

/** Moldura das telas de acesso: painel institucional à esquerda, formulário à direita. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      <div className="flex flex-col justify-between gap-10 bg-navy px-6 py-8 text-white md:w-[44%] md:max-w-155 md:p-12">
        <Link href="/" className="font-semibold text-sidebar-text hover:text-white">
          ← Voltar ao site
        </Link>
        <div>
          <Logo className="mb-8" />
          <p className="max-w-120 text-[28px] leading-[34px] font-bold tracking-[-0.02em] md:text-4xl md:leading-11">
            Cada sinal é uma chance de agir antes da saída.
          </p>
          <p className="mt-4 max-w-110 text-lg leading-7 text-sidebar-text">
            Dados, diagnóstico, predição, ação, retenção e aprendizado institucional.
          </p>
        </div>
        <span className="hidden text-[13px] leading-5 text-sidebar-text md:block">
          Acesso restrito a contas criadas pela instituição.
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10 md:px-8">
        <div className="w-full max-w-100">{children}</div>
      </div>
    </div>
  );
}
