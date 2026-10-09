import type { Metadata } from "next";
import Link from "next/link";
import { BarList } from "@/components/charts/charts";
import { Badge, FAIXA, type Tone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/pagination";
import { KpiCard, PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatusSelect } from "@/features/acoes/status-select";
import { cursosVisiveis } from "@/features/alunos/queries";
import { atualizarStatusPedido } from "@/features/desligamento/equipe-actions";
import {
  filtrosPedidosSchema,
  hrefPedidos,
  listarPedidos,
  painelDesligamento,
  POR_PAGINA_PEDIDOS,
  resumoPedidos,
  type PainelDesligamento,
} from "@/features/desligamento/equipe-queries";
import { RegistrarPedido } from "@/features/desligamento/registrar-pedido";
import { requirePapel } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, num } from "@/lib/format";
import { MOTIVO, STATUS_PEDIDO, STATUS_QUESTIONARIO, TIPO_DESLIGAMENTO } from "@/lib/labels";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Pedidos de desligamento" };

const TOM_QUESTIONARIO: Record<Database["public"]["Enums"]["status_questionario"], Tone> = {
  pendente: "neutral",
  em_andamento: "info",
  enviado: "ok",
  recusado: "neutral",
  encerrado: "neutral",
};

const OPCOES_STATUS = Object.entries(STATUS_PEDIDO).map(([value, label]) => ({ value, label }));

function rotuloMotivo(m: string | null) {
  return m && m in MOTIVO ? MOTIVO[m as keyof typeof MOTIVO] : (m ?? "—");
}

export default async function DesligamentosPage({ searchParams }: PageProps<"/desligamentos">) {
  const sessao = await requirePapel("gestor", "coordenador", "apoio");
  const f = filtrosPedidosSchema.parse(await searchParams);
  const instituicaoInteira = sessao.papel !== "coordenador";

  const supabase = await createClient();
  const [resumo, lista, painel, cursos, semestres] = await Promise.all([
    resumoPedidos(f),
    listarPedidos(f),
    instituicaoInteira ? painelDesligamento(f) : Promise.resolve(null),
    cursosVisiveis(sessao.papel),
    supabase.from("periodos_letivos").select("codigo").order("inicio", { ascending: false }),
  ]);
  const listaCursos = cursos.ok ? cursos.data : [];

  return (
    <>
      <PageHeader
        eyebrow={instituicaoInteira ? "Todos os cursos" : "Cursos que você coordena"}
        title="Pedidos de desligamento"
        actions={<RegistrarPedido />}
      />

      <Panel flat>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 lg:w-1/3">
            <p className="text-body">
              O questionário fica disponível ao aluno quando o pedido de trancamento ou cancelamento é aberto. Ele registra
              os motivos da saída e se o modelo havia sinalizado o aluno antes do pedido.
            </p>
          </div>
          {resumo.ok ? (
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiCard subtle label="Pedidos abertos" value={num(resumo.data.abertos)} />
              <KpiCard subtle label="Questionários respondidos" value={num(resumo.data.respondidos)} hint="entre os abertos" />
              <KpiCard
                subtle
                label="Já sinalizados"
                value={`${num(resumo.data.sinalizados)} de ${num(resumo.data.abertos)}`}
                hint="pelo modelo antes do pedido"
              />
            </div>
          ) : (
            <ErrorState />
          )}
        </div>
      </Panel>

      <Panel title="Pedidos" description="Mais recentes primeiro.">
        <form method="get" action="/desligamentos" className="mb-4 flex flex-wrap items-end gap-3">
          {listaCursos.length > 1 && (
            <Filtro id="f-curso" rotulo="Curso">
              <Select id="f-curso" name="curso" defaultValue={f.curso ?? ""} className="min-w-48">
                <option value="">Todos</option>
                {listaCursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Filtro>
          )}
          <Filtro id="f-semestre" rotulo="Semestre">
            <Select id="f-semestre" name="semestre" defaultValue={f.semestre ?? ""}>
              <option value="">Todos</option>
              {(semestres.data ?? []).map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {s.codigo}
                </option>
              ))}
            </Select>
          </Filtro>
          <Filtro id="f-tipo" rotulo="Tipo">
            <Select id="f-tipo" name="tipo" defaultValue={f.tipo ?? ""}>
              <option value="">Todos</option>
              <option value="trancamento">Trancamento</option>
              <option value="cancelamento">Cancelamento</option>
            </Select>
          </Filtro>
          <Filtro id="f-status" rotulo="Pedido">
            <Select id="f-status" name="status" defaultValue={f.status}>
              <option value="aberto">Abertos</option>
              <option value="concluido">Concluídos</option>
              <option value="revertido">Revertidos</option>
              <option value="todos">Todos</option>
            </Select>
          </Filtro>
          <Filtro id="f-questionario" rotulo="Questionário">
            <Select id="f-questionario" name="questionario" defaultValue={f.questionario ?? ""}>
              <option value="">Todos</option>
              {Object.entries(STATUS_QUESTIONARIO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Filtro>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            <ButtonLink href="/desligamentos" variant="ghost">
              Limpar
            </ButtonLink>
          </div>
        </form>

        {!lista.ok ? (
          <ErrorState />
        ) : lista.data.length === 0 ? (
          <EmptyState title="Nenhum pedido com estes filtros." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 border-collapse">
                <thead>
                  <tr className="label-caps text-left text-muted">
                    <th scope="col" className="border-b border-line px-2 py-3">Aluno</th>
                    <th scope="col" className="border-b border-line px-2 py-3">Pedido</th>
                    <th scope="col" className="border-b border-line px-2 py-3">Aberto em</th>
                    <th scope="col" className="border-b border-line px-2 py-3">Risco no pedido</th>
                    <th scope="col" className="border-b border-line px-2 py-3">Questionário</th>
                    <th scope="col" className="border-b border-line px-2 py-3">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.data.map((p) => (
                    <tr key={p.id}>
                      <td className="border-b border-line px-2 py-2.5">
                        <Link href={`/desligamentos/${p.id}`} className="font-bold text-navy underline hover:text-primary">
                          {p.codigo}
                        </Link>
                        <div className="max-w-48 truncate text-xs leading-4 text-muted">{p.curso_nome}</div>
                      </td>
                      <td className="border-b border-line px-2 py-2.5 text-[13px] leading-5">
                        {p.tipo ? TIPO_DESLIGAMENTO[p.tipo] : "—"}
                        {p.origem === "manual" && <div className="text-muted">registro manual</div>}
                      </td>
                      <td className="border-b border-line px-2 py-2.5 text-[13px] leading-5">{dataCurta(p.aberto_em)}</td>
                      <td className="border-b border-line px-2 py-2.5">
                        {p.faixa_no_pedido ? (
                          <Badge tone={FAIXA[p.faixa_no_pedido].tone} dot>
                            {FAIXA[p.faixa_no_pedido].label}
                          </Badge>
                        ) : (
                          <Badge>Sem avaliação</Badge>
                        )}
                        <div className="mt-1 text-xs leading-4 text-muted">
                          {p.sinalizado_previamente ? "sinalizado antes do pedido" : "não sinalizado antes"}
                        </div>
                      </td>
                      <td className="border-b border-line px-2 py-2.5">
                        {p.questionario_status ? (
                          <Badge tone={TOM_QUESTIONARIO[p.questionario_status]}>
                            {STATUS_QUESTIONARIO[p.questionario_status]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="border-b border-line px-2 py-2.5">
                        <StatusSelect
                          key={`pedido-${p.id}-${p.status}`}
                          id={p.id ?? ""}
                          campoId="pedidoId"
                          valor={p.status ?? "aberto"}
                          opcoes={OPCOES_STATUS}
                          rotulo={`Situação do pedido do aluno ${p.codigo}`}
                          acao={atualizarStatusPedido}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagina={f.pagina}
              porPagina={POR_PAGINA_PEDIDOS}
              total={lista.total}
              href={(pagina) => hrefPedidos(f, { pagina })}
            />
          </>
        )}
      </Panel>

      {painel && (painel.ok ? <Analises painel={painel.data} /> : <ErrorState title="Não foi possível carregar as análises." />)}
    </>
  );
}

function Filtro({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-32 flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

function Analises({ painel: p }: { painel: PainelDesligamento }) {
  const suprimido = (
    <EmptyState title={`Menos de ${p.minimo} questionários respondidos neste recorte.`}>
      Para proteger a identidade dos alunos, recortes pequenos não são exibidos.
    </EmptyState>
  );
  const rec = p.reconsideracao;
  const reconsideraram = rec ? (rec.sim ?? 0) + (rec.talvez ?? 0) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Questionários respondidos" value={num(p.respondidos)} hint={`de ${num(p.pedidos)} pedidos no recorte`} />
        <KpiCard
          label="Reconsiderariam com apoio"
          value={reconsideraram == null ? "—" : num(reconsideraram)}
          hint={rec ? `${num(rec.sim ?? 0)} sim e ${num(rec.talvez ?? 0)} talvez` : "recorte pequeno"}
        />
        <KpiCard label="Pedidos revertidos" value={num(p.revertidos)} hint="aluno permaneceu" />
        <KpiCard label="Pedidos de apoio gerados" value={num(p.apoio_gerado)} hint="a partir dos questionários" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Panel
          title="Motivos declarados"
          description="Percentual dos respondentes. Cada aluno pode marcar mais de um motivo. Saúde só aparece com 5 ocorrências ou mais."
        >
          {p.motivos ? (
            <BarList
              cor="bg-navy"
              dados={p.motivos.map((m) => ({ rotulo: rotuloMotivo(m.motivo), valor: m.pct, texto: `${m.pct}%` }))}
            />
          ) : (
            suprimido
          )}
        </Panel>

        <Panel
          title="Risco anterior e motivo declarado"
          description="Compara alunos sinalizados pelo modelo antes do pedido com os que não foram."
        >
          {p.risco_x_motivo.length === 0 ? (
            suprimido
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[true, false].map((sinalizado) => {
                const g = p.risco_x_motivo.find((x) => x.sinalizado === sinalizado);
                return (
                  <div key={String(sinalizado)} className="rounded-card bg-canvas p-4">
                    <div className="label-caps mb-2 text-muted">
                      {sinalizado ? "Sinalizados antes" : "Não sinalizados"}
                      {g ? ` · ${num(g.respondidos)}` : ""}
                    </div>
                    {g?.motivos ? (
                      <ul className="flex flex-col gap-1 text-[13px] leading-5">
                        {g.motivos.slice(0, 4).map((m) => (
                          <li key={m.motivo} className="flex justify-between gap-3">
                            <span>{rotuloMotivo(m.motivo)}</span>
                            <span className="tabular font-bold">{m.pct}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] leading-5 text-muted">Recorte com menos de {p.minimo} respostas.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Motivo principal por curso" description={`Cursos com pelo menos ${p.minimo} questionários respondidos.`}>
          {p.por_curso.length === 0 ? (
            suprimido
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-110 border-collapse">
                <thead>
                  <tr className="label-caps text-left text-muted">
                    <th scope="col" className="border-b border-line px-2 py-3">Curso</th>
                    <th scope="col" className="border-b border-line px-2 py-3">Motivo mais citado</th>
                    <th scope="col" className="border-b border-line px-2 py-3 text-right">Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {p.por_curso.map((c) => (
                    <tr key={c.curso}>
                      <td className="border-b border-line px-2 py-2.5 font-semibold">{c.curso}</td>
                      <td className="border-b border-line px-2 py-2.5 text-[13px] leading-5">
                        {rotuloMotivo(c.principal)} {c.pct_principal != null && <span className="font-bold">({c.pct_principal}%)</span>}
                      </td>
                      <td className="tabular border-b border-line px-2 py-2.5 text-right">{num(c.respondidos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Pedidos por semestre" description="Pedidos abertos em cada semestre e questionários respondidos.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-80 border-collapse">
              <thead>
                <tr className="label-caps text-left text-muted">
                  <th scope="col" className="border-b border-line px-2 py-3">Semestre</th>
                  <th scope="col" className="border-b border-line px-2 py-3 text-right">Pedidos</th>
                  <th scope="col" className="border-b border-line px-2 py-3 text-right">Respondidos</th>
                </tr>
              </thead>
              <tbody>
                {p.por_semestre.map((s) => (
                  <tr key={s.semestre}>
                    <td className="border-b border-line px-2 py-2.5 font-semibold">{s.semestre}</td>
                    <td className="tabular border-b border-line px-2 py-2.5 text-right">{num(s.pedidos)}</td>
                    <td className="tabular border-b border-line px-2 py-2.5 text-right">{num(s.respondidos)}</td>
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

