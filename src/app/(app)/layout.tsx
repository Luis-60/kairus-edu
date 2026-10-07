import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireSessao } from "@/lib/auth/session";
import { NAVEGACAO, PAPEL_LABEL } from "@/lib/auth/roles";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sessao = await requireSessao();

  return (
    <AppShell
      nav={NAVEGACAO[sessao.papel]}
      nome={sessao.nome}
      papelLabel={PAPEL_LABEL[sessao.papel]}
      instituicao={sessao.instituicaoNome}
    >
      {children}
    </AppShell>
  );
}
