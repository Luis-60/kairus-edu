import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { carregarQuestionario } from "@/features/desligamento/queries";
import { QuestionarioWizard } from "@/features/desligamento/questionario-wizard";
import { requirePapel } from "@/lib/auth/session";
import { dataCurta } from "@/lib/format";
import { STATUS_QUESTIONARIO, TIPO_DESLIGAMENTO } from "@/lib/labels";

export const metadata: Metadata = { title: "Questionário de desligamento" };

export default async function QuestionarioPage({ params }: PageProps<"/situacao-academica/questionario/[id]">) {
  await requirePapel("estudante");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const resultado = await carregarQuestionario(id);
  if (!resultado.ok) return <ErrorState />;
  // RLS: questionário de outro estudante simplesmente não existe para este usuário.
  if (!resultado.data) notFound();

  const q = resultado.data;
  const aberto = (q.status === "pendente" || q.status === "em_andamento") && q.pedido?.status === "aberto";

  return (
    <>
      <PageHeader
        eyebrow={
          q.pedido ? `Pedido de ${TIPO_DESLIGAMENTO[q.pedido.tipo].toLowerCase()} aberto em ${dataCurta(q.pedido.aberto_em)}` : undefined
        }
        title="Questionário de desligamento"
        actions={
          <ButtonLink href="/situacao-academica" variant="secondary">
            Sair e continuar depois
          </ButtonLink>
        }
      />
      <Panel className="max-w-3xl">
        {aberto ? (
          <>
            <p className="mb-6 text-[13px] leading-5 text-muted">
              Responder é opcional e leva poucos minutos. Suas respostas ajudam a instituição a entender o que levou você a
              este pedido e a oferecer o apoio certo.
            </p>
            <QuestionarioWizard dados={q} />
          </>
        ) : (
          <EmptyState
            title={`Este questionário não está mais aberto (${STATUS_QUESTIONARIO[q.status].toLowerCase()}).`}
            action={<ButtonLink href="/situacao-academica">Voltar para Situação acadêmica</ButtonLink>}
          />
        )}
      </Panel>
    </>
  );
}
