import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";

/** Não encontrado dentro da área logada (mantém a navegação; sem revelar se o recurso existe). */
export default function NaoEncontrado() {
  return (
    <>
      <PageHeader title="Página não encontrada" />
      <EmptyState
        title="O endereço não existe ou você não tem acesso a ele."
        action={<ButtonLink href="/inicio">Ir para a página inicial</ButtonLink>}
      />
    </>
  );
}
