import type { Metadata } from "next";
import { BarList, ColumnChart, LineChart } from "@/components/charts/charts";
import { FAIXA, RiskBadge } from "@/components/ui/badge";
import { ButtonLink, DownloadLink } from "@/components/ui/button";
import { KpiCard, PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Delta } from "@/features/gestao/delta";
import { carregarVisaoGeral } from "@/features/gestao/queries";
import { requirePapel } from "@/lib/auth/session";
import { num, pct1 } from "@/lib/format";
import { MODALIDADE, MOTIVO } from "@/lib/labels";

export const metadata: Metadata = { title: "Visão geral" };

export default async function GestaoPage() {
  await requirePapel("gestor");
  const d = await carregarVisaoGeral();

  const k = d.kpis.ok ? d.kpis.data : null;
  const permanencia = k?.taxa_evasao != null ? 100 - Number(k.taxa_evasao) : null;
  const permanenciaAnterior = k?.taxa_evasao_anterior != null ? 100 - Number(k.taxa_evasao_anterior) : null;

  return (
    <>
      <PageHeader
        eyebrow={
          k?.periodo_encerrado
            ? `Semestre encerrado ${k.periodo_encerrado}${k.periodo_corrente ? ` e turma em andamento ${k.periodo_corrente}` : ""}`
            : undefined
        }
        title="Visão geral da instituição"
        actions={
          <DownloadLink href="/gestao/relatorio">Exportar relatório</DownloadLink>
        }
      />

      {!k ? (
        <ErrorState title="Não foi possível carregar os indicadores." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Taxa de evasão"
            value={pct1(k.taxa_evasao)}
            hint={<Delta atual={k.taxa_evasao} anterior={k.taxa_evasao_anterior} menorMelhor unidade="pp" />}
          />
          <KpiCard
            label="Taxa de permanência"
            value={pct1(permanencia)}
            hint={<Delta atual={permanencia} anterior={permanenciaAnterior} menorMelhor={false} unidade="pp" />}
          />
          <KpiCard
            label="Alunos em risco"
            value={num(k.alunos_risco)}
            hint={<Delta atual={k.alunos_risco} anterior={k.alunos_risco_anterior} menorMelhor unidade="n" />}
          />
          <KpiCard
            label="Cancelamentos"
            value={num(k.cancelamentos)}
            hint={<Delta atual={k.cancelamentos} anterior={k.cancelamentos_anterior} menorMelhor unidade="n" />}
          />
          <KpiCard
            label="Trancamentos"
            value={num(k.trancamentos)}
            hint={<Delta atual={k.trancamentos} anterior={k.trancamentos_anterior} menorMelhor unidade="n" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Evolução da evasão" description="Percentual de alunos que evadiram em cada semestre encerrado">
          {!d.semestres.ok ? (
            <ErrorState />
          ) : d.semestres.data.length === 0 ? (
            <EmptyState title="Nenhum semestre encerrado ainda.">
              A evolução aparece quando o primeiro semestre for encerrado.
            </EmptyState>
          ) : (
            <LineChart
              dados={d.semestres.data.map((s) => ({ rotulo: s.codigo, valor: Number(s.taxa ?? 0) }))}
              descricao={`Evasão por semestre: ${d.semestres.data.map((s) => `${pct1(s.taxa)} em ${s.codigo}`).join(", ")}`}
            />
          )}
        </Panel>

        <Panel
          title="Alunos por nível de risco"
          description={k?.periodo_corrente ? `${num(k.alunos_em_andamento)} alunos em andamento em ${k.periodo_corrente}` : undefined}
        >
          {!d.faixas.ok ? (
            <ErrorState />
          ) : (
            <DistribuicaoRisco faixas={d.faixas.data} />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="Evasão por curso"
          description={
            d.semestres.ok && d.semestres.data.length > 0
              ? `Semestres encerrados, de ${d.semestres.data[0].codigo} a ${d.semestres.data[d.semestres.data.length - 1].codigo}`
              : "Semestres encerrados"
          }
        >
          {!d.cursos.ok ? (
            <ErrorState />
          ) : d.cursos.data.length === 0 ? (
            <EmptyState title="Sem dados de evasão por curso." />
          ) : (
            <BarList
              dados={d.cursos.data.map((c) => ({ rotulo: c.rotulo, valor: Number(c.taxa ?? 0), texto: pct1(c.taxa) }))}
            />
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Evasão por período" description="Momento da jornada em que o aluno saiu">
            {!d.periodos.ok ? (
              <ErrorState />
            ) : d.periodos.data.length === 0 ? (
              <EmptyState title="Sem dados por período." />
            ) : (
              <ColumnChart
                dados={d.periodos.data.map((p) => ({ rotulo: p.rotulo, valor: Number(p.taxa ?? 0), texto: pct1(p.taxa) }))}
                descricao={`Evasão por período do curso: ${d.periodos.data.map((p) => `${p.rotulo} ${pct1(p.taxa)}`).join(", ")}. Em destaque, os períodos acima da média.`}
              />
            )}
          </Panel>
          <Panel title="Evasão por modalidade">
            {!d.modalidades.ok ? (
              <ErrorState />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {d.modalidades.data.map((m, i) => (
                  <div
                    key={m.rotulo}
                    className={i === 0 ? "rounded-card bg-navy p-4 text-white" : "rounded-card bg-tint p-4"}
                  >
                    <div className={i === 0 ? "label-caps text-sidebar-text" : "label-caps text-muted"}>
                      {MODALIDADE[m.rotulo as keyof typeof MODALIDADE] ?? m.rotulo}
                    </div>
                    <div className="tabular text-[28px] leading-9 font-extrabold">{pct1(m.taxa)}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Panel id="motivos">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 lg:w-1/3">
            <h2 className="text-lg leading-7 font-bold">Principais motivos de desligamento</h2>
            <p className="mb-4 text-[13px] leading-5 text-muted">
              {d.motivos.ok && d.motivos.data.length > 0
                ? `Dificuldades declaradas em ${num(d.motivos.data[0].total_respostas)} questionários respondidos. Cada aluno pode marcar mais de uma.`
                : "Dificuldades declaradas nos questionários de desligamento"}
            </p>
            {d.insight.ok && d.insight.data[0] && (
              <div className="flex flex-col gap-1.5 rounded-card bg-tint p-4">
                <span className="label-caps text-primary">Insight</span>
                <span className="font-semibold">{d.insight.data[0].texto}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {!d.motivos.ok ? (
              <ErrorState />
            ) : d.motivos.data.length === 0 ? (
              <EmptyState title="Ainda não há respostas suficientes.">
                Os motivos aparecem a partir de 5 questionários respondidos, para que nenhum aluno possa ser identificado.
              </EmptyState>
            ) : (
              <BarList
                cor="bg-navy"
                dados={d.motivos.data.map((m) => ({
                  rotulo: MOTIVO[m.motivo],
                  valor: Number(m.percentual),
                  texto: `${m.percentual}%`,
                }))}
              />
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}

function DistribuicaoRisco({ faixas }: { faixas: { faixa: keyof typeof FAIXA; total: number }[] }) {
  const ordem: (keyof typeof FAIXA)[] = ["baixo", "atencao", "alto"];
  const porFaixa = new Map(faixas.map((f) => [f.faixa, f.total]));
  const total = faixas.reduce((s, f) => s + f.total, 0);

  if (total === 0) {
    return <EmptyState title="Nenhuma avaliação de risco no período em andamento." />;
  }

  const descricao = ordem
    .map((f) => `${Math.round(((porFaixa.get(f) ?? 0) / total) * 100)}% ${FAIXA[f].label.toLowerCase()}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-4">
      <div role="img" aria-label={descricao} className="flex h-4 gap-0.5 overflow-hidden rounded-full">
        {ordem.map((f) => (
          <div key={f} className={FAIXA[f].fill} style={{ width: `${((porFaixa.get(f) ?? 0) / total) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {ordem.map((f) => (
          <li key={f} className="flex items-center justify-between">
            <RiskBadge faixa={f} />
            <span className="tabular font-bold">{num(porFaixa.get(f) ?? 0)}</span>
          </li>
        ))}
      </ul>
      <ButtonLink href="/inteligencia" variant="ghost" className="justify-start px-0">
        Abrir Inteligência de Permanência →
      </ButtonLink>
    </div>
  );
}
