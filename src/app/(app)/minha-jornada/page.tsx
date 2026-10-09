import type { Metadata } from "next";
import { KpiCard, PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { Meter } from "@/components/ui/states";
import { ApoioDialog } from "@/features/apoio/apoio-dialog";
import { questionariosPendentes } from "@/features/desligamento/queries";
import { carregarJornada } from "@/features/estudante/queries";
import { requirePapel } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { dataCurta, dec1, num, pct1 } from "@/lib/format";
import { ASSUNTO_APOIO, STATUS_SOLICITACAO } from "@/lib/labels";

export const metadata: Metadata = { title: "Minha jornada" };

export default async function MinhaJornadaPage() {
  const sessao = await requirePapel("estudante");
  const [jornada, pendentes] = await Promise.all([carregarJornada(sessao.userId), questionariosPendentes(sessao.userId)]);

  if (!jornada.ok) {
    return (
      <>
        <PageHeader title="Minha jornada" />
        <ErrorState />
      </>
    );
  }

  if (!jornada.data) {
    return (
      <>
        <PageHeader title="Minha jornada" />
        <EmptyState title="Sua matrícula ainda não está vinculada a esta conta.">
          Procure a secretaria acadêmica para concluir o vínculo.
        </EmptyState>
      </>
    );
  }

  const j = jornada.data;
  const ind = j.indicadores;
  const frequencia = ind?.frequencia != null ? Number(ind.frequencia) : null;
  const abaixoMinimo = frequencia != null && frequencia < j.frequenciaMinima;
  const atrasadas = ind?.entregas_atrasadas ?? 0;

  // A mensagem usa apenas sinais que o próprio estudante já conhece (frequência e entregas).
  const apoio = abaixoMinimo
    ? { titulo: "Sua frequência está abaixo do mínimo. Podemos ajudar?", assunto: "frequencia" as const }
    : atrasadas > 0
      ? { titulo: "Você tem entregas em atraso. Podemos ajudar?", assunto: "outro" as const }
      : { titulo: "Precisa de apoio para seguir no curso?", assunto: "outro" as const };

  return (
    <>
      <PageHeader eyebrow={`${j.curso}, ${j.periodoAtual}º período, matrícula ${j.codigo}`} title="Minha jornada" />

      {pendentes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary bg-surface p-4">
          <div className="min-w-0">
            <p className="font-semibold">Você tem um questionário sobre o seu pedido de desligamento.</p>
            <p className="text-[13px] leading-5 text-muted">
              É opcional e leva poucos minutos. Suas respostas ajudam a instituição a oferecer o apoio certo.
            </p>
          </div>
          <ButtonLink href={`/situacao-academica/questionario/${pendentes[0].id}`}>
            {pendentes[0].status === "pendente" ? "Responder" : "Continuar"}
          </ButtonLink>
        </div>
      )}

      <Panel>
        <div className="mb-5 flex flex-wrap justify-between gap-3">
          <h2 className="text-lg leading-7 font-bold">Do ingresso à formatura</h2>
          {ind?.creditos_concluidos_pct != null && (
            <span className="font-bold">{num(Number(ind.creditos_concluidos_pct))}% dos créditos concluídos</span>
          )}
        </div>
        <ol className="flex gap-2 overflow-x-auto pb-1" aria-label={`Período ${j.periodoAtual} de ${j.totalPeriodos}`}>
          {Array.from({ length: j.totalPeriodos }, (_, i) => i + 1).map((p) => {
            const atual = p === j.periodoAtual;
            return (
              <li key={p} className="flex min-w-18 flex-1 flex-col gap-2" aria-current={atual ? "step" : undefined}>
                <div
                  className={cn(
                    "h-2.5 rounded-full",
                    p < j.periodoAtual ? "bg-navy" : atual ? "bg-accent" : "bg-line",
                  )}
                />
                <span className={cn("text-[13px] leading-5", atual ? "font-bold text-navy" : "text-muted")}>
                  {atual ? `${p}º, você está aqui` : `${p}º`}
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_2fr]">
        <KpiCard
          label="Frequência"
          value={pct1(frequencia)}
          hint={
            frequencia == null ? (
              "ainda sem registro"
            ) : abaixoMinimo ? (
              <span className="font-bold text-warn">Abaixo do mínimo de {num(j.frequenciaMinima)}%</span>
            ) : (
              `mínimo de ${num(j.frequenciaMinima)}%`
            )
          }
        />
        <KpiCard label="Coeficiente de rendimento" value={dec1(ind?.coeficiente)} hint="escala de 0 a 10" />
        <KpiCard
          label="Disciplinas no semestre"
          value={num(ind?.disciplinas)}
          hint={atrasadas > 0 ? `${num(atrasadas)} ${atrasadas === 1 ? "entrega" : "entregas"} em atraso` : "nenhuma entrega em atraso"}
        />

        <div id="apoio" className="flex min-w-0 flex-col gap-2 rounded-card bg-navy p-5 text-white sm:col-span-3 xl:col-span-1">
          <div className="label-caps text-sidebar-text">Apoio e permanência</div>
          <div className="text-lg leading-7 font-bold">{apoio.titulo}</div>
          <p className="text-[13px] leading-5 text-sidebar-text">
            Fale com a coordenação, conheça as bolsas de permanência ou ajuste sua grade. Pensando em trancar? Converse
            com a gente antes.
          </p>
          <div className="mt-2">
            {j.solicitacaoAberta && (
              <p className="rounded-control bg-white/10 px-3 py-2 text-[13px] leading-5">
                Pedido enviado em {dataCurta(j.solicitacaoAberta.created_at)}
                {j.solicitacaoAberta.assunto ? ` sobre ${ASSUNTO_APOIO[j.solicitacaoAberta.assunto].toLowerCase()}` : ""}.
                Situação: {STATUS_SOLICITACAO[j.solicitacaoAberta.status]}.
              </p>
            )}
            <ApoioDialog assuntoSugerido={apoio.assunto} podeAbrir={!j.solicitacaoAberta} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Panel
          id="competencias"
          title="Minhas competências"
          description="Reconhecidas a partir das disciplinas e atividades que você já concluiu"
        >
          {j.competencias.length === 0 ? (
            <EmptyState title="Nenhuma competência reconhecida ainda.">
              Elas aparecem conforme você conclui disciplinas e atividades.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {j.competencias.map((c) => (
                <li key={c.nome} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{c.nome}</span>
                    <span className="text-[13px] leading-5 text-muted">
                      {c.nivel === "desenvolvendo" ? "Em desenvolvimento · " : ""}
                      {c.origem}
                    </span>
                  </div>
                  <Meter value={c.progresso} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          id="curriculo"
          title="Meu currículo"
          description="Monte seu perfil profissional, confirme suas competências e gere um currículo em PDF pronto para sistemas de recrutamento."
        >
          {j.ultimaVersao ? (
            <div className="flex flex-col gap-3">
              <p className="text-body">
                Última versão: <span className="font-semibold">{j.ultimaVersao.titulo}</span>, gerada em{" "}
                {dataCurta(j.ultimaVersao.created_at)}.
              </p>
              <ButtonLink href="/curriculo" variant="secondary" className="self-start">
                Abrir meu currículo
              </ButtonLink>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line bg-canvas p-5">
              <span className="text-body">Você ainda não gerou um currículo.</span>
              <ButtonLink href="/curriculo/perfil">Montar meu currículo</ButtonLink>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
