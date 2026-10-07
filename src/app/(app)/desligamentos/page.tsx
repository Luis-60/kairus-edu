import type { Metadata } from "next";
import Link from "next/link";
import { BarList } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { KpiCard, PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  filtrosPedidosSchema,
  hrefPedidos,
  listarPedidos,
  motivosAgregados,
  POR_PAGINA_PEDIDOS,
  resumoPedidosAbertos,
  type FiltrosPedidos,
} from "@/features/desligamentos/queries";
import { requirePapel } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { dataCurta, num } from "@/lib/format";
import { MOTIVO, STATUS_PEDIDO, TIPO_DESLIGAMENTO } from "@/lib/labels";

export const metadata: Metadata = { title: "Pesquisa de desligamento" };

export default async function DesligamentosPage({ searchParams }: PageProps<"/desligamentos">) {
  const sessao = await requirePapel("gestor", "coordenador");
  const f = filtrosPedidosSchema.parse(await searchParams);
  const gestor = sessao.papel === "gestor";

  const [resumo, lista, motivos] = await Promise.all([
    resumoPedidosAbertos(),
    listarPedidos(f),
    gestor ? motivosAgregados() : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={gestor ? "Todos os cursos" : "Cursos que você coordena"}
        title={gestor ? "Pesquisas de desligamento" : "Pesquisa de desligamento"}
      />

      <Panel flat>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 lg:w-1/3">
            <p className="text-body">
              Aplicada no pedido de trancamento ou cancelamento. Registra o motivo da saída e se o modelo havia
              sinalizado o aluno antes.
            </p>
          </div>
          {resumo.ok ? (
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiCard subtle label="Pedidos abertos" value={num(resumo.data.abertos)} />
              <KpiCard subtle label="Pesquisas respondidas" value={num(resumo.data.respondidos)} />
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

      <div className={cn("grid grid-cols-1 items-start gap-6", gestor && "xl:grid-cols-[3fr_2fr]")}>
        <ListaPedidos f={f} lista={lista} />

        {gestor && (
          <Panel
            title="Motivos declarados"
            description="Respostas com consentimento, agregadas. Respostas individuais não são exibidas."
          >
            {!motivos || !motivos.ok ? (
              <ErrorState />
            ) : motivos.data.length === 0 ? (
              <EmptyState title="Ainda não há respostas suficientes.">
                Os motivos aparecem a partir de 5 questionários respondidos.
              </EmptyState>
            ) : (
              <BarList
                cor="bg-navy"
                dados={motivos.data.map((m) => ({
                  rotulo: MOTIVO[m.motivo],
                  valor: Number(m.percentual),
                  texto: `${m.percentual}%`,
                }))}
              />
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

function ListaPedidos({ f, lista }: { f: FiltrosPedidos; lista: Awaited<ReturnType<typeof listarPedidos>> }) {
  const filtros: { v: FiltrosPedidos["status"]; l: string }[] = [
    { v: "aberto", l: "Abertos" },
    { v: "concluido", l: "Concluídos" },
    { v: "todos", l: "Todos" },
  ];

  return (
    <Panel
      title="Pedidos"
      description="Mais recentes primeiro."
      actions={
        <div className="flex flex-wrap gap-2 text-[13px] leading-5 font-semibold">
          {filtros.map((s) => (
            <Link
              key={s.v}
              href={hrefPedidos(f, { status: s.v, pagina: 1 })}
              aria-current={f.status === s.v ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1",
                f.status === s.v ? "bg-navy text-white" : "bg-canvas text-muted hover:text-primary",
              )}
            >
              {s.l}
            </Link>
          ))}
        </div>
      }
    >
      {!lista.ok ? (
        <ErrorState />
      ) : lista.data.length === 0 ? (
        <EmptyState title="Nenhum pedido nesta situação." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-155 border-collapse">
              <thead>
                <tr className="label-caps text-left text-muted">
                  <th scope="col" className="border-b border-line px-2 py-3">Aluno</th>
                  <th scope="col" className="border-b border-line px-2 py-3">Pedido</th>
                  <th scope="col" className="border-b border-line px-2 py-3">Aberto em</th>
                  <th scope="col" className="border-b border-line px-2 py-3">Sinalizado</th>
                  <th scope="col" className="border-b border-line px-2 py-3">Pesquisa</th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((p) => (
                  <tr key={p.id}>
                    <td className="border-b border-line px-2 py-2.5">
                      <Link href={`/alunos?aluno=${p.codigo}`} className="font-bold text-navy underline hover:text-primary">
                        {p.codigo}
                      </Link>
                      <div className="max-w-48 truncate text-xs leading-4 text-muted">{p.curso_nome}</div>
                    </td>
                    <td className="border-b border-line px-2 py-2.5 text-[13px] leading-5">
                      {p.tipo ? TIPO_DESLIGAMENTO[p.tipo] : "—"}
                      <div className="text-muted">{p.status ? STATUS_PEDIDO[p.status] : ""}</div>
                    </td>
                    <td className="border-b border-line px-2 py-2.5 text-[13px] leading-5">{dataCurta(p.aberto_em)}</td>
                    <td className="border-b border-line px-2 py-2.5">
                      {p.sinalizado_previamente ? <Badge tone="warn">Sim</Badge> : <Badge>Não</Badge>}
                    </td>
                    <td className="border-b border-line px-2 py-2.5">
                      {p.pesquisa_respondida ? <Badge tone="ok">Respondida</Badge> : <Badge>Pendente</Badge>}
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
            href={(p) => hrefPedidos(f, { pagina: p })}
          />
        </>
      )}
    </Panel>
  );
}
