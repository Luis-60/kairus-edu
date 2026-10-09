import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { atualizarStatusAcao } from "@/features/acoes/actions";
import {
  contarSolicitacoesAbertas,
  filtrosAcoesSchema,
  hrefAcoes,
  listarAcoes,
  listarSolicitacoes,
  POR_PAGINA_ACOES,
  type FiltrosAcoes,
} from "@/features/acoes/queries";
import { ConcluirCheckbox } from "@/features/acoes/concluir-checkbox";
import { StatusSelect } from "@/features/acoes/status-select";
import { atualizarSolicitacao } from "@/features/apoio/actions";
import { requirePapel } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { dataCurta } from "@/lib/format";
import { ASSUNTO_APOIO, STATUS_ACAO, STATUS_SOLICITACAO, TIPO_ACAO } from "@/lib/labels";

export const metadata: Metadata = { title: "Ações de permanência" };

const OPCOES_STATUS = Object.entries(STATUS_ACAO).map(([value, label]) => ({ value, label }));
const OPCOES_SOLICITACAO = Object.entries(STATUS_SOLICITACAO).map(([value, label]) => ({ value, label }));

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AcoesPage({ searchParams }: PageProps<"/acoes">) {
  const sessao = await requirePapel("gestor", "coordenador", "apoio");
  const f = filtrosAcoesSchema.parse(await searchParams);
  const abertas = await contarSolicitacoesAbertas();

  return (
    <>
      <PageHeader
        eyebrow={sessao.papel === "coordenador" ? "Cursos que você coordena" : "Todos os cursos"}
        title="Ações de permanência"
      />

      <LinkTabs
        rotulo="Seções de ações"
        abas={[
          { href: hrefAcoes(f, { aba: "acoes", pagina: 1 }), label: "Ações registradas", ativa: f.aba === "acoes" },
          {
            href: hrefAcoes(f, { aba: "apoio", pagina: 1 }),
            label: (
              <>
                Pedidos de apoio
                {abertas > 0 && <Badge tone="strong">{abertas}</Badge>}
              </>
            ),
            ativa: f.aba === "apoio",
          },
        ]}
      />

      {f.aba === "acoes" ? <ListaAcoes f={f} usuarioId={sessao.userId} /> : <ListaApoio f={f} />}
    </>
  );
}

async function ListaAcoes({ f, usuarioId }: { f: FiltrosAcoes; usuarioId: string }) {
  const lista = await listarAcoes(f, usuarioId);
  const hoje = hojeISO();
  const filtrosStatus: { v: FiltrosAcoes["status"]; l: string }[] = [
    { v: "abertas", l: "Em aberto" },
    { v: "concluida", l: "Concluídas" },
    { v: "cancelada", l: "Canceladas" },
    { v: "todas", l: "Todas" },
  ];

  return (
    <Panel
      title="Acompanhamento"
      description="Ordenado pelo prazo. Altere o status conforme a ação avança."
      actions={
        <div className="flex flex-wrap gap-2 text-[13px] leading-5 font-semibold">
          {filtrosStatus.map((s) => (
            <Link
              key={s.v}
              href={hrefAcoes(f, { status: s.v, pagina: 1 })}
              aria-current={f.status === s.v ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1",
                f.status === s.v ? "bg-navy text-white" : "bg-canvas text-muted hover:text-primary",
              )}
            >
              {s.l}
            </Link>
          ))}
          <Link
            href={hrefAcoes(f, { minhas: f.minhas ? undefined : "1", pagina: 1 })}
            aria-current={f.minhas ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1",
              f.minhas ? "bg-primary text-white" : "bg-canvas text-muted hover:text-primary",
            )}
          >
            Sob minha responsabilidade
          </Link>
        </div>
      }
    >
      {!lista.ok ? (
        <ErrorState />
      ) : lista.data.length === 0 ? (
        <EmptyState
          title="Nenhuma ação encontrada."
          action={
            <ButtonLink href="/alunos?faixa=alto&acao=pendente" variant="secondary">
              Ver alunos em alto risco sem ação
            </ButtonLink>
          }
        >
          Ações são registradas a partir da ficha do aluno.
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {lista.data.map((a) => {
              const atrasada = a.prazo && a.prazo < hoje && (a.status === "pendente" || a.status === "em_andamento");
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-1 gap-3 py-4 md:grid-cols-[44px_110px_minmax(0,1fr)_170px_150px] md:items-center"
                >
                  <ConcluirCheckbox
                    key={`concluir-${a.id}-${a.status}`}
                    acaoId={a.id ?? ""}
                    concluida={a.status === "concluida"}
                    desabilitada={a.status === "cancelada"}
                    rotulo={`Marcar como concluída a ação do aluno ${a.codigo}`}
                  />
                  <div>
                    <Link
                      href={`/alunos?aluno=${a.codigo}`}
                      className="font-bold text-navy underline hover:text-primary"
                    >
                      {a.codigo}
                    </Link>
                    <div className="truncate text-xs leading-4 text-muted">{a.curso_nome}</div>
                  </div>
                  <div className="min-w-0">
                    <div className={cn("font-semibold", a.status === "concluida" && "text-muted line-through")}>
                      {a.tipo ? TIPO_ACAO[a.tipo] : "Ação"}
                    </div>
                    <p className="line-clamp-2 text-[13px] leading-5 text-body">{a.descricao}</p>
                  </div>
                  <div className="text-[13px] leading-5">
                    <div className="text-body">{a.responsavel_nome}</div>
                    <div className={cn(atrasada ? "font-bold text-danger" : "text-muted")}>
                      Prazo {dataCurta(a.prazo)}
                      {atrasada && " · atrasada"}
                    </div>
                  </div>
                  <StatusSelect
                    key={`status-${a.id}-${a.status}`}
                    id={a.id ?? ""}
                    campoId="acaoId"
                    valor={a.status ?? "pendente"}
                    opcoes={OPCOES_STATUS}
                    rotulo={`Status da ação do aluno ${a.codigo}`}
                    acao={atualizarStatusAcao}
                  />
                </li>
              );
            })}
          </ul>
          <Pagination
            pagina={f.pagina}
            porPagina={POR_PAGINA_ACOES}
            total={lista.total}
            href={(p) => hrefAcoes(f, { pagina: p })}
          />
        </>
      )}
    </Panel>
  );
}

async function ListaApoio({ f }: { f: FiltrosAcoes }) {
  const lista = await listarSolicitacoes(f.pagina);

  return (
    <Panel
      title="Pedidos de apoio dos estudantes"
      description="Enviados pelo estudante em Minha jornada. Abertos primeiro."
    >
      {!lista.ok ? (
        <ErrorState />
      ) : lista.data.length === 0 ? (
        <EmptyState title="Nenhum pedido de apoio recebido.">
          Quando um estudante pedir contato da coordenação, o pedido aparece aqui.
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {lista.data.map((s) => (
              <li key={s.id} className="grid grid-cols-1 gap-3 py-4 md:grid-cols-[110px_minmax(0,1fr)_170px] md:items-start">
                <div>
                  <Link href={`/alunos?aluno=${s.codigo}`} className="font-bold text-navy underline hover:text-primary">
                    {s.codigo}
                  </Link>
                  <div className="truncate text-xs leading-4 text-muted">{s.curso_nome}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{s.assunto ? ASSUNTO_APOIO[s.assunto] : "Pedido de apoio"}</div>
                  <p className="text-[13px] leading-5 text-body">{s.mensagem}</p>
                  <p className="text-xs leading-4 text-muted">Enviado em {dataCurta(s.created_at)}</p>
                </div>
                <StatusSelect
                  key={`${s.id}-${s.status}`}
                  id={s.id ?? ""}
                  campoId="solicitacaoId"
                  valor={s.status ?? "aberta"}
                  opcoes={OPCOES_SOLICITACAO}
                  rotulo={`Status do pedido do aluno ${s.codigo}`}
                  acao={atualizarSolicitacao}
                />
              </li>
            ))}
          </ul>
          <Pagination
            pagina={f.pagina}
            porPagina={POR_PAGINA_ACOES}
            total={lista.total}
            href={(p) => hrefAcoes(f, { pagina: p })}
          />
        </>
      )}
    </Panel>
  );
}
