import type { Metadata } from "next";
import Link from "next/link";
import { Badge, type Tone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { carregarSituacao } from "@/features/desligamento/queries";
import { requirePapel } from "@/lib/auth/session";
import { dataCurta } from "@/lib/format";
import {
  ASSUNTO_APOIO,
  CATEGORIA_SERVICO,
  STATUS_PEDIDO,
  STATUS_QUESTIONARIO,
  STATUS_SOLICITACAO,
  TIPO_DESLIGAMENTO,
} from "@/lib/labels";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Situação acadêmica" };

const SITUACAO: Record<Database["public"]["Enums"]["situacao_estudante"], string> = {
  ativo: "Matrícula ativa",
  trancado: "Matrícula trancada",
  cancelado: "Matrícula cancelada",
  evadido: "Matrícula inativa",
  formado: "Curso concluído",
};

const TOM_QUESTIONARIO: Record<Database["public"]["Enums"]["status_questionario"], Tone> = {
  pendente: "warn",
  em_andamento: "info",
  enviado: "ok",
  recusado: "neutral",
  encerrado: "neutral",
};

export default async function SituacaoAcademicaPage({ searchParams }: PageProps<"/situacao-academica">) {
  const sessao = await requirePapel("estudante");
  const params = await searchParams;
  const situacao = await carregarSituacao(sessao.userId);

  if (!situacao.ok) {
    return (
      <>
        <PageHeader title="Situação acadêmica" />
        <ErrorState />
      </>
    );
  }
  if (!situacao.data) {
    return (
      <>
        <PageHeader title="Situação acadêmica" />
        <EmptyState title="Sua matrícula ainda não está vinculada a esta conta.">
          Procure a secretaria acadêmica para concluir o vínculo.
        </EmptyState>
      </>
    );
  }

  const s = situacao.data;
  const aviso = params.questionario === "enviado"
    ? "Respostas enviadas. Obrigado por contar sua experiência."
    : params.questionario === "recusado"
      ? "Tudo bem. O questionário foi encerrado e não afeta o seu pedido."
      : null;

  return (
    <>
      <PageHeader eyebrow={`${s.curso}, matrícula ${s.codigo}`} title="Situação acadêmica" />
      {aviso && <FormMessage tone="success">{aviso}</FormMessage>}

      <Panel title="Matrícula">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Dado rotulo="Situação" valor={SITUACAO[s.situacao]} />
          <Dado rotulo="Curso" valor={s.curso} />
          <Dado rotulo="Período" valor={`${s.periodoAtual}º de ${s.totalPeriodos}`} />
          <Dado rotulo="Ingresso" valor={s.ingresso ?? "—"} />
          <Dado rotulo="Previsão de conclusão" valor={s.previsaoConclusao ?? "—"} />
        </dl>
        <p className="mt-4 text-[13px] leading-5 text-muted">
          Algum dado está errado? Peça a correção à secretaria acadêmica; ele vem do sistema acadêmico da instituição.
        </p>
      </Panel>

      <Panel
        title="Pedidos de trancamento ou cancelamento"
        description="Os pedidos são feitos na secretaria acadêmica. Aqui você acompanha a situação e responde ao questionário, se quiser."
      >
        {s.pedidos.length === 0 ? (
          <EmptyState title="Você não tem pedidos de trancamento ou cancelamento." />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {s.pedidos.map((p) => {
              const q = p.questionario;
              const podeResponder = p.status === "aberto" && q && (q.status === "pendente" || q.status === "em_andamento");
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {TIPO_DESLIGAMENTO[p.tipo]} · {STATUS_PEDIDO[p.status]}
                    </div>
                    <div className="text-[13px] leading-5 text-muted">Aberto em {dataCurta(p.aberto_em)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {q && <Badge tone={TOM_QUESTIONARIO[q.status]}>Questionário: {STATUS_QUESTIONARIO[q.status].toLowerCase()}</Badge>}
                    {podeResponder && q && (
                      <ButtonLink href={`/situacao-academica/questionario/${q.id}`}>
                        {q.status === "pendente" ? "Responder questionário" : "Continuar questionário"}
                      </ButtonLink>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel
          title="Apoio e permanência"
          description="Serviços que a sua instituição oferece. Pensando em trancar? Converse com a gente antes."
        >
          {s.servicos.length === 0 ? (
            <EmptyState title="A instituição ainda não cadastrou serviços de apoio." />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {s.servicos.map((sv) => (
                <li key={sv.id} className="flex flex-col gap-1 rounded-card bg-canvas p-4">
                  <span className="label-caps text-primary">{CATEGORIA_SERVICO[sv.categoria]}</span>
                  <span className="font-bold">{sv.nome}</span>
                  <span className="text-[13px] leading-5 text-body">{sv.descricao}</span>
                  {sv.contato && <span className="text-[13px] leading-5 text-muted">{sv.contato}</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Meus pedidos de apoio">
          {s.solicitacoes.length === 0 ? (
            <EmptyState title="Nenhum pedido de apoio.">
              Você pode pedir contato em{" "}
              <Link href="/minha-jornada#apoio" className="font-semibold text-primary hover:text-primary-hover">
                Minha jornada
              </Link>
              .
            </EmptyState>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {s.solicitacoes.map((sol) => (
                <li key={sol.id} className="flex flex-col gap-1 py-3 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{sol.servicos_apoio?.nome ?? ASSUNTO_APOIO[sol.assunto]}</span>
                    <Badge tone={sol.status === "encerrada" ? "neutral" : "info"}>{STATUS_SOLICITACAO[sol.status]}</Badge>
                  </div>
                  <span className="text-[13px] leading-5 text-muted">
                    {sol.origem === "pesquisa" ? "Pedido feito no questionário" : "Pedido feito por você"} em {dataCurta(sol.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-muted">{rotulo}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}
