import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { carregarJornada } from "@/features/estudante/queries";
import { ImprimirButton } from "@/features/ia/imprimir-button";
import { requirePapel } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Meu currículo" };

/** Versão do currículo pronta para impressão ou para salvar em PDF pelo navegador. */
export default async function CurriculoPage() {
  const sessao = await requirePapel("estudante");
  const jornada = await carregarJornada(sessao.userId);

  if (!jornada.ok) return <ErrorState />;
  const j = jornada.data;
  if (!j?.curriculo?.resumo) {
    return (
      <EmptyState
        title="Seu currículo ainda não foi gerado."
        action={<ButtonLink href="/minha-jornada#curriculo">Voltar para Minha jornada</ButtonLink>}
      />
    );
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Meu currículo"
          actions={
            <>
              <ButtonLink href="/minha-jornada#curriculo" variant="secondary">
                Voltar
              </ButtonLink>
              <ImprimirButton />
            </>
          }
        />
        <p className="mt-2 text-[13px] leading-5 text-muted">
          Texto gerado por IA. Revise antes de enviar. Na janela de impressão, escolha “Salvar como PDF”.
        </p>
      </div>

      <article className="mx-auto flex w-full max-w-200 flex-col gap-6 rounded-card border border-line bg-surface p-8 shadow-card print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-line pb-4">
          <h1 className="text-[28px] leading-[34px] font-bold">{sessao.nome}</h1>
          <p className="text-body">
            Estudante de {j.curso}, {j.periodoAtual}º período
          </p>
        </header>
        <section>
          <h2 className="label-caps mb-1 text-muted">Resumo</h2>
          <p>{j.curriculo.resumo}</p>
        </section>
        <section>
          <h2 className="label-caps mb-1 text-muted">Formação</h2>
          <p>
            {j.curso}, {sessao.instituicaoNome}. Cursando o {j.periodoAtual}º de {j.totalPeriodos} períodos.
          </p>
        </section>
        {j.curriculo.competencias_texto && (
          <section>
            <h2 className="label-caps mb-1 text-muted">Competências</h2>
            <p>{j.curriculo.competencias_texto}</p>
          </section>
        )}
        {j.curriculo.experiencia_texto && (
          <section>
            <h2 className="label-caps mb-1 text-muted">Experiência</h2>
            <p>{j.curriculo.experiencia_texto}</p>
          </section>
        )}
      </article>
    </>
  );
}
