import type { Metadata } from "next";
import { BarList } from "@/components/charts/charts";
import { Button, ButtonLink } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form";
import { KpiCard, PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cursosVisiveis } from "@/features/alunos/queries";
import { carregarEmpregabilidade } from "@/features/empregabilidade/queries";
import { requirePapel } from "@/lib/auth/session";
import { num } from "@/lib/format";

export const metadata: Metadata = { title: "Empregabilidade" };

const TIPO_VAGA: Record<string, string> = { estagio: "Estágio", emprego: "Emprego", trainee: "Trainee", aprendiz: "Jovem aprendiz" };

function pct(parte: number | null, total: number) {
  return parte == null || total === 0 ? null : Math.round((100 * parte) / total);
}

export default async function EmpregabilidadePage({ searchParams }: PageProps<"/empregabilidade">) {
  const sessao = await requirePapel("gestor", "apoio");
  const params = await searchParams;
  const curso = typeof params.curso === "string" && /^[0-9a-f-]{36}$/i.test(params.curso) ? params.curso : undefined;
  const [painel, cursos] = await Promise.all([carregarEmpregabilidade(curso), cursosVisiveis(sessao.papel)]);
  const listaCursos = cursos.ok ? cursos.data : [];

  if (!painel.ok) {
    return (
      <>
        <PageHeader title="Empregabilidade" />
        <ErrorState />
      </>
    );
  }
  const p = painel.data;
  const menos = `menos de ${p.minimo}`;
  const contagem = (v: number | null) => (v == null ? menos : num(v));

  return (
    <>
      <PageHeader
        eyebrow={curso ? listaCursos.find((c) => c.id === curso)?.nome : "Todos os cursos"}
        title="Empregabilidade"
        actions={
          <form method="get" className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-curso">Curso</Label>
              <Select id="emp-curso" name="curso" defaultValue={curso ?? ""} className="min-w-56">
                <option value="">Todos os cursos</option>
                {listaCursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {curso && (
              <ButtonLink href="/empregabilidade" variant="ghost">
                Limpar
              </ButtonLink>
            )}
          </form>
        }
      />

      <p className="max-w-200 text-[13px] leading-5 text-muted">
        Indicadores agregados do uso do construtor de currículo, para planejar ações de desenvolvimento profissional.
        Currículos, buscas de vaga e análises individuais não são visíveis à instituição. Grupos com menos de {p.minimo}{" "}
        alunos não são exibidos.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Alunos com perfil profissional" value={contagem(p.com_perfil)} hint={`de ${num(p.ativos)} ativos${pct(p.com_perfil, p.ativos) != null ? ` (${pct(p.com_perfil, p.ativos)}%)` : ""}`} />
        <KpiCard label="Perfis completos" value={contagem(p.completos)} hint="contato, experiência e competência confirmada" />
        <KpiCard label="Alunos com currículo gerado" value={contagem(p.com_curriculo)} hint={`${pct(p.com_curriculo, p.ativos) ?? "—"}% dos ativos`} />
        <KpiCard label="Versões de currículo" value={contagem(p.versoes)} hint="PDFs gerados no período" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Panel
          title="Lacunas mais frequentes"
          description="Requisitos de vagas analisadas pelos alunos que eles ainda não têm confirmados. Bom ponto de partida para oficinas."
        >
          {p.lacunas.length === 0 ? (
            <EmptyState title="Sem lacunas com alunos suficientes para exibir." />
          ) : (
            <BarList cor="bg-navy" dados={p.lacunas.map((l) => ({ rotulo: l.nome, valor: l.alunos, texto: num(l.alunos) }))} />
          )}
        </Panel>

        <Panel title="Competências confirmadas mais comuns" description="Declaradas e confirmadas pelos próprios alunos.">
          {p.competencias.length === 0 ? (
            <EmptyState title="Sem competências com alunos suficientes para exibir." />
          ) : (
            <BarList dados={p.competencias.map((c) => ({ rotulo: c.nome, valor: c.alunos, texto: num(c.alunos) }))} />
          )}
        </Panel>

        <Panel title="Interesses de carreira" description="Área de interesse informada no perfil.">
          {p.interesses.length === 0 ? (
            <EmptyState title="Sem interesses com alunos suficientes para exibir." />
          ) : (
            <BarList dados={p.interesses.map((i) => ({ rotulo: i.area, valor: i.alunos, texto: num(i.alunos) }))} />
          )}
          {p.tipos_vaga.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-4 text-[13px] leading-5">
              {p.tipos_vaga.map((t) => (
                <span key={t.tipo}>
                  <span className="text-muted">{TIPO_VAGA[t.tipo] ?? t.tipo}:</span> <span className="tabular font-bold">{num(t.alunos)}</span>
                </span>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Participação por curso">
          <div className="overflow-x-auto">
            <table className="w-full min-w-110 border-collapse">
              <thead>
                <tr className="label-caps text-left text-muted">
                  <th scope="col" className="border-b border-line px-2 py-3">Curso</th>
                  <th scope="col" className="border-b border-line px-2 py-3 text-right">Ativos</th>
                  <th scope="col" className="border-b border-line px-2 py-3 text-right">Com perfil</th>
                  <th scope="col" className="border-b border-line px-2 py-3 text-right">Com currículo</th>
                </tr>
              </thead>
              <tbody>
                {p.por_curso.map((c) => (
                  <tr key={c.curso}>
                    <td className="border-b border-line px-2 py-2.5 font-semibold">{c.curso}</td>
                    <td className="tabular border-b border-line px-2 py-2.5 text-right">{num(c.ativos)}</td>
                    <td className="tabular border-b border-line px-2 py-2.5 text-right">
                      {c.com_perfil == null ? <span className="text-muted">{menos}</span> : `${num(c.com_perfil)} (${pct(c.com_perfil, c.ativos)}%)`}
                    </td>
                    <td className="tabular border-b border-line px-2 py-2.5 text-right">
                      {c.com_curriculo == null ? <span className="text-muted">{menos}</span> : num(c.com_curriculo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
