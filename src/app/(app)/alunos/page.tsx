import type { Metadata } from "next";
import Link from "next/link";
import { FAIXA, RiskBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/pagination";
import { KpiCard, PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState, Meter } from "@/components/ui/states";
import { Ficha } from "@/features/alunos/ficha";
import { FichaContainer } from "@/features/alunos/ficha-container";
import { filtrosSchema, hrefCarteira, POR_PAGINA, type Filtros } from "@/features/alunos/filtros";
import {
  abrirFicha,
  cursosVisiveis,
  equipe as carregarEquipe,
  listarCarteira,
  periodoCorrente,
  resumoCarteira,
} from "@/features/alunos/queries";
import { requirePapel } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { num, probabilidade } from "@/lib/format";

export const metadata: Metadata = { title: "Alunos" };

const SITUACAO_ACAO: Record<string, string> = {
  registrada: "Registrada",
  pendente: "Pendente",
  nao_se_aplica: "Não se aplica",
};

export default async function AlunosPage({ searchParams }: PageProps<"/alunos">) {
  const sessao = await requirePapel("gestor", "coordenador", "apoio");
  const filtros = filtrosSchema.parse(await searchParams);

  const [lista, resumo, cursos, periodo, ficha, equipe] = await Promise.all([
    listarCarteira(filtros),
    resumoCarteira(filtros.curso),
    cursosVisiveis(sessao.papel),
    periodoCorrente(),
    filtros.aluno ? abrirFicha(filtros.aluno) : Promise.resolve(null),
    carregarEquipe(),
  ]);

  const listaCursos = cursos.ok ? cursos.data : [];
  const cursoUnico = sessao.papel === "coordenador" && listaCursos.length === 1 ? listaCursos[0] : null;
  const mostrarCurso = !cursoUnico;
  const r = resumo.ok ? resumo.data : null;
  const fecharFicha = hrefCarteira(filtros, { aluno: undefined });

  return (
    <>
      <PageHeader
        eyebrow={
          sessao.papel === "coordenador"
            ? `Coordenação de curso${periodo ? `, semestre ${periodo}` : ""}`
            : `Todos os cursos${periodo ? `, semestre ${periodo}` : ""}`
        }
        title={cursoUnico?.nome ?? (sessao.papel === "coordenador" ? "Minha carteira" : "Alunos")}
      />

      {r ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <KpiCard label="Alunos na carteira" value={num(r.total)} hint="em andamento" />
          <KpiCard label="Alto risco" value={num(r.alto)} valueClassName="text-danger" hint="prioridade desta semana" />
          <KpiCard label="Atenção" value={num(r.atencao)} valueClassName="text-warn" hint="acompanhar na quinzena" />
          <KpiCard
            dark
            label="Cobertura de ações"
            value={`${num(r.alto_com_acao)} de ${num(r.alto)}`}
            hint="alunos em Alto risco com ação registrada"
          />
        </div>
      ) : (
        <ErrorState title="Não foi possível carregar o resumo da carteira." />
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel id="lista" title="Lista priorizada" description="Ordenada por risco. Selecione um código para abrir a ficha.">
          <FiltrosForm filtros={filtros} cursos={mostrarCurso ? listaCursos : []} />

          {!lista.ok ? (
            <ErrorState
              action={
                <ButtonLink href={hrefCarteira(filtros, {})} variant="secondary">
                  Tentar novamente
                </ButtonLink>
              }
            />
          ) : lista.data.length === 0 ? (
            <EmptyState
              title="Nenhum aluno encontrado com estes filtros."
              action={
                <ButtonLink href="/alunos" variant="secondary">
                  Limpar filtros
                </ButtonLink>
              }
            >
              Revise o código digitado ou amplie os filtros.
            </EmptyState>
          ) : (
            <>
              {/* Tabela a partir de 640px */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-140 border-collapse">
                  <thead>
                    <tr className="label-caps text-left text-muted">
                      <th scope="col" className="border-b border-line px-2 py-3">Aluno</th>
                      {mostrarCurso && <th scope="col" className="border-b border-line px-2 py-3">Curso</th>}
                      <th scope="col" className="border-b border-line px-2 py-3">Período</th>
                      <th scope="col" className="border-b border-line px-2 py-3">Risco</th>
                      <th scope="col" className="border-b border-line px-2 py-3">Faixa</th>
                      <th scope="col" className="border-b border-line px-2 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.data.map((a) => {
                      const selecionado = a.codigo === filtros.aluno;
                      return (
                        <tr key={a.estudante_id} className={cn(selecionado && "bg-canvas")}>
                          <td className="border-b border-line px-2 py-1">
                            <Link
                              href={hrefCarteira(filtros, { aluno: a.codigo ?? undefined })}
                              scroll={false}
                              aria-current={selecionado ? "true" : undefined}
                              className="inline-flex min-h-11 items-center px-1 font-bold text-navy underline hover:text-primary"
                            >
                              {a.codigo}
                            </Link>
                          </td>
                          {mostrarCurso && (
                            <td className="max-w-48 truncate border-b border-line px-2 py-1 text-[13px] leading-5 text-body">
                              {a.curso_nome}
                            </td>
                          )}
                          <td className="border-b border-line px-2 py-1">{a.periodo_atual}º</td>
                          <td className="border-b border-line px-2 py-1">
                            <div className="flex min-w-32 items-center gap-2">
                              <Meter
                                className="flex-1"
                                value={Number(a.probabilidade ?? 0) * 100}
                                fillClassName={a.faixa ? FAIXA[a.faixa].fill : "bg-muted"}
                                trackClassName="bg-line"
                              />
                              <span className="tabular w-10 text-right font-bold">{probabilidade(a.probabilidade)}</span>
                            </div>
                          </td>
                          <td className="border-b border-line px-2 py-1">
                            <RiskBadge faixa={a.faixa} />
                          </td>
                          <td className="border-b border-line px-2 py-1 text-[13px] leading-5 text-body">
                            {a.situacao_acao ? SITUACAO_ACAO[a.situacao_acao] : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Lista compacta no mobile */}
              <ul className="flex flex-col divide-y divide-line sm:hidden">
                {lista.data.map((a) => (
                  <li key={a.estudante_id}>
                    <Link
                      href={hrefCarteira(filtros, { aluno: a.codigo ?? undefined })}
                      scroll={false}
                      className="flex flex-col gap-1.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold underline">{a.codigo}</span>
                        <RiskBadge faixa={a.faixa} />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[13px] leading-5 text-body">
                        <span>
                          {a.periodo_atual}º período{mostrarCurso ? ` · ${a.curso_nome}` : ""}
                        </span>
                        <span className="tabular font-bold text-navy">{probabilidade(a.probabilidade)}</span>
                      </div>
                      <span className="text-[13px] leading-5 text-muted">
                        Ação: {a.situacao_acao ? SITUACAO_ACAO[a.situacao_acao] : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <Pagination
                pagina={filtros.pagina}
                porPagina={POR_PAGINA}
                total={lista.total}
                href={(p) => hrefCarteira(filtros, { pagina: p, aluno: undefined })}
              />
            </>
          )}
        </Panel>

        <FichaContainer aberta={Boolean(filtros.aluno)} codigo={filtros.aluno} fecharHref={fecharFicha}>
          {!filtros.aluno ? (
              <EmptyState title="Nenhum aluno selecionado.">
                Selecione um código na lista para ver o índice de risco, os fatores e registrar uma ação.
              </EmptyState>
            ) : !ficha || !ficha.ok ? (
              <ErrorState title="Não foi possível abrir a ficha." />
            ) : !ficha.data ? (
              <EmptyState
                title="Aluno não encontrado."
                action={
                  <ButtonLink href={fecharFicha} variant="secondary">
                    Fechar ficha
                  </ButtonLink>
                }
              >
                O código não existe ou não faz parte da sua carteira.
              </EmptyState>
            ) : (
              <Ficha ficha={ficha.data} equipe={equipe.ok ? equipe.data : []} usuarioId={sessao.userId} />
            )}
        </FichaContainer>
      </div>
    </>
  );
}

function FiltrosForm({ filtros, cursos }: { filtros: Filtros; cursos: { id: string; nome: string }[] }) {
  const temFiltro = Boolean(filtros.q || filtros.faixa || filtros.acao || filtros.periodo || filtros.curso);
  return (
    <form method="get" action="/alunos" role="search" className="mb-4 flex flex-wrap items-end gap-3">
      <div className="flex min-w-36 flex-1 flex-col gap-1.5">
        <Label htmlFor="f-q">Código</Label>
        <Input id="f-q" name="q" defaultValue={filtros.q} placeholder="Ex.: A04112" className="py-2.5" maxLength={12} />
      </div>
      {cursos.length > 1 && (
        <div className="flex min-w-44 flex-1 flex-col gap-1.5">
          <Label htmlFor="f-curso">Curso</Label>
          <Select id="f-curso" name="curso" defaultValue={filtros.curso ?? ""}>
            <option value="">Todos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex min-w-32 flex-col gap-1.5">
        <Label htmlFor="f-faixa">Faixa</Label>
        <Select id="f-faixa" name="faixa" defaultValue={filtros.faixa ?? ""}>
          <option value="">Todas</option>
          <option value="alto">Alto risco</option>
          <option value="atencao">Atenção</option>
          <option value="baixo">Baixo risco</option>
        </Select>
      </div>
      <div className="flex min-w-28 flex-col gap-1.5">
        <Label htmlFor="f-periodo">Período</Label>
        <Select id="f-periodo" name="periodo" defaultValue={filtros.periodo ? String(filtros.periodo) : ""}>
          <option value="">Todos</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>
              {p}º
            </option>
          ))}
        </Select>
      </div>
      <div className="flex min-w-36 flex-col gap-1.5">
        <Label htmlFor="f-acao">Ação</Label>
        <Select id="f-acao" name="acao" defaultValue={filtros.acao ?? ""}>
          <option value="">Todas</option>
          <option value="pendente">Pendente</option>
          <option value="registrada">Registrada</option>
          <option value="nao_se_aplica">Não se aplica</option>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {temFiltro && (
          <ButtonLink href="/alunos" variant="ghost">
            Limpar
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
