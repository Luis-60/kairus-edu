import type { Metadata } from "next";
import { BarList } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { KpiCard, PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { gerarInsights } from "@/features/ia/actions";
import { GerarButton } from "@/features/ia/gerar-button";
import { carregarInteligencia } from "@/features/inteligencia/queries";
import { requirePapel } from "@/lib/auth/session";
import { dataCurta, dec1, num, pct1 } from "@/lib/format";

export const metadata: Metadata = { title: "Inteligência de Permanência" };

function auc(valor: number | null | undefined) {
  return valor == null ? "—" : Number(valor).toFixed(2).replace(".", ",");
}

export default async function InteligenciaPage() {
  await requirePapel("gestor");
  const d = await carregarInteligencia();

  const metricas = d.metricas.ok ? d.metricas.data : [];
  const matricula = metricas.find((m) => m.momento === "matricula");
  const semanas = metricas.find((m) => m.momento === "quatro_semanas");
  const referencia = semanas ?? matricula;

  const faixas = d.faixas.ok ? new Map(d.faixas.data.map((f) => [f.faixa, f.total])) : null;
  const analisados = faixas ? [...faixas.values()].reduce((a, b) => a + b, 0) : null;
  const alto = faixas?.get("alto") ?? 0;
  const atencao = faixas?.get("atencao") ?? 0;

  const insightsIa = d.insights.ok && d.insights.data.some((i) => i.origem === "ia");
  const geradoEm = d.insights.ok ? d.insights.data.find((i) => i.gerado_em)?.gerado_em : null;

  return (
    <>
      <PageHeader
        eyebrow={
          referencia
            ? `Modelo treinado de ${referencia.periodo_treino} e testado em ${referencia.periodo_teste}, semestre que ele não viu`
            : undefined
        }
        title="Inteligência de Permanência"
        actions={referencia?.base_simulada ? <Badge tone="warn">Métricas em base simulada</Badge> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Alunos analisados" value={num(analisados)} hint="turma em andamento" />
        <KpiCard
          label="Alunos em risco"
          value={num(faixas ? alto + atencao : null)}
          hint={`${num(alto)} em Alto risco e ${num(atencao)} em Atenção`}
        />
        <KpiCard label="Precisão do modelo" value={auc(semanas?.auc)} hint="AUC no semestre de teste" />
        <KpiCard
          label="Captura"
          value={semanas?.captura_top20 != null ? `${num(Number(semanas.captura_top20))}%` : "—"}
          hint="dos evadidos nos 20% de maior risco"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="Principais fatores associados à evasão"
          description="Peso relativo de cada sinal nas previsões da turma atual, entre os alunos em risco"
        >
          {!d.fatores.ok ? (
            <ErrorState />
          ) : d.fatores.data.length === 0 ? (
            <EmptyState title="Ainda não há avaliações suficientes no período." />
          ) : (
            (() => {
              const pesos = d.fatores.data.map((f) => f.alunos * Number(f.peso_medio));
              const max = Math.max(...pesos, 1);
              return (
                <BarList
                  dados={d.fatores.data.map((f, i) => ({
                    rotulo: f.fator,
                    valor: (pesos[i] / max) * 100,
                    texto: `${num(f.alunos)}`,
                  }))}
                />
              );
            })()
          )}
          <p className="mt-4 text-[13px] leading-5 text-muted">
            O número indica quantos alunos em risco têm o fator entre os mais relevantes. Os fatores indicam associação
            nos dados. Eles não provam causa.
          </p>
        </Panel>

        <Panel
          title="Precisão do modelo ao longo do semestre"
          description="Capacidade de separar quem evadiu de quem ficou. Quanto mais perto de 1, melhor."
        >
          {metricas.length === 0 ? (
            <EmptyState title="Nenhuma métrica do modelo registrada." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {matricula && (
                <div className="rounded-card bg-canvas p-5">
                  <div className="label-caps text-muted">Na matrícula</div>
                  <div className="tabular text-[32px] leading-10 font-extrabold">{auc(matricula.auc)}</div>
                  <p className="text-[13px] leading-5 text-muted">
                    Só com dados de ingresso. Os 20% de maior risco captam{" "}
                    {matricula.captura_top20 != null ? `${num(Number(matricula.captura_top20))}%` : "—"} dos evadidos.
                  </p>
                </div>
              )}
              {semanas && (
                <div className="rounded-card bg-navy p-5 text-white">
                  <div className="label-caps text-sidebar-text">Após 4 semanas</div>
                  <div className="tabular text-[32px] leading-10 font-extrabold">{auc(semanas.auc)}</div>
                  <p className="text-[13px] leading-5 text-sidebar-text">
                    Com frequência, acessos, entregas e notas. Os 20% de maior risco captam{" "}
                    {semanas.captura_top20 != null ? `${num(Number(semanas.captura_top20))}%` : "—"}.
                  </p>
                </div>
              )}
            </div>
          )}
          {referencia?.base_simulada && (
            <p className="mt-4 text-[13px] leading-5 text-muted">
              Resultado em base simulada. Com dados reais o desempenho precisa ser medido de novo e tende a ser menor.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Panel
          title="Segmentos com maior risco"
          description={d.media != null ? `Evasão histórica por segmento, comparada à média de ${pct1(d.media)}` : undefined}
        >
          {!d.segmentos.ok ? (
            <ErrorState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-105 border-collapse">
                <thead>
                  <tr className="label-caps text-left text-muted">
                    <th scope="col" className="border-b border-line px-2 py-3">Segmento</th>
                    <th scope="col" className="border-b border-line px-2 py-3">Recorte</th>
                    <th scope="col" className="border-b border-line px-2 py-3 text-right">Evasão</th>
                  </tr>
                </thead>
                <tbody>
                  {d.segmentos.data.map((s) => (
                    <tr key={`${s.recorte}-${s.nome}`}>
                      <td className="border-b border-line px-2 py-3 font-semibold">{s.nome}</td>
                      <td className="border-b border-line px-2 py-3">
                        <Badge tone="info">{s.recorte}</Badge>
                      </td>
                      <td className="tabular border-b border-line px-2 py-3 text-right font-bold">{dec1(s.taxa)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg leading-7 font-bold">{insightsIa ? "Insights gerados pela IA" : "Insights"}</h2>
              <p className="text-[13px] leading-5 text-muted">
                {insightsIa && geradoEm
                  ? `Gerados em ${dataCurta(geradoEm)} a partir de indicadores agregados. Revise antes de decidir.`
                  : "A IA lê apenas indicadores agregados, sem dados de alunos individuais."}
              </p>
            </div>
            <GerarButton
              acao={gerarInsights}
              rotulo={insightsIa ? "Gerar novamente" : "Gerar insights com IA"}
              rotuloPendente="Analisando indicadores…"
              variante="secondary"
              sucesso="Insights atualizados."
            />
          </div>
          {!d.insights.ok ? (
            <ErrorState />
          ) : d.insights.data.length === 0 ? (
            <EmptyState title="Nenhum insight ainda.">Gere insights a partir dos indicadores atuais.</EmptyState>
          ) : (
            d.insights.data.map((i) => (
              <div key={i.id} className="flex flex-col gap-2 rounded-card bg-tint p-5">
                <span className="label-caps text-primary">{i.categoria}</span>
                <span className="text-lg leading-7 font-semibold">{i.texto}</span>
                {i.acao_sugerida && (
                  <span className="text-[13px] leading-5 text-body">Ação sugerida: {i.acao_sugerida}</span>
                )}
              </div>
            ))
          )}
        </section>
      </div>

      <Panel flat>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 max-w-200">
            <h2 className="text-lg leading-7 font-bold">O modelo orienta. A equipe decide.</h2>
            <p className="text-body">
              O sistema estima probabilidade e nunca afirma que um aluno vai sair. Alunos aparecem por código, o
              questionário pede consentimento e cada acesso fica registrado.
            </p>
          </div>
          <ButtonLink href="/alunos?faixa=alto" variant="ghost">
            Ver alunos sinalizados →
          </ButtonLink>
        </div>
      </Panel>
    </>
  );
}
