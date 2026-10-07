import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { homeFor, requireSessao } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Acesso não permitido" };

export default async function SemPermissaoPage() {
  const sessao = await requireSessao();
  return (
    <>
      <PageHeader title="Acesso não permitido" />
      <EmptyState
        title="Seu perfil não tem acesso a esta área."
        action={<ButtonLink href={homeFor(sessao.papel)}>Ir para a minha página inicial</ButtonLink>}
      >
        Se você precisa deste acesso, fale com a gestão da sua instituição.
      </EmptyState>
    </>
  );
}
