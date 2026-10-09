import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, FAIXA } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { carregarPedido } from "@/features/desligamento/equipe-queries";
import {
  PERGUNTA_COMENTARIO,
  PERGUNTA_OUTRO,
  PERGUNTA_SERVICOS,
  perguntaPorId,
} from "@/features/desligamento/questionario";
import { requirePapel } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dataCurta } from "@/lib/format";
import { MOTIVO, RECONSIDERACAO, STATUS_PEDIDO, STATUS_QUESTIONARIO, TIPO_DESLIGAMENTO } from "@/lib/labels";

export const metadata: Metadata = { title: "Pedido de desligamento" };

export default async function PedidoPage({ params }: PageProps<"/desligamentos/[id]">) {
  await requirePapel("gestor", "coordenador", "apoio");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const resultado = await carregarPedido(id);
  if (!resultado.ok) return <ErrorState />;
  if (!resultado.data) notFound();
  const p = resultado.data;

  // Nomes dos serviços escolhidos (catálogo da instituição).
  const idsServicos = Array.isArray(p.respostas.valores[PERGUNTA_SERVICOS])
    ? (p.respostas.valores[PERGUNTA_SERVICOS] as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const supabase = await createClient();
  const { data: servicos } = idsServicos.length
    ? await supabase.from("servicos_apoio").select("nome").in("id", idsServicos)
    : { data: [] };

  const contexto = Object.entries(p.respostas.valores).flatMap(([perguntaId, valor]) => {
    const pergunta = perguntaPorId(perguntaId);
    if (!pergunta || perguntaId === PERGUNTA_COMENTARIO.id || perguntaId === PERGUNTA_OUTRO.id) return [];
    const texto = typeof valor === "string" ? (pergunta.opcoes?.find((o) => o.valor === valor)?.rotulo ?? valor) : "";
    return [{ pergunta: pergunta.texto, resposta: texto }];
  });
  const comentario = p.respostas.valores[PERGUNTA_COMENTARIO.id];
  const outro = p.respostas.valores[PERGUNTA_OUTRO.id];

  return (
    <>
      <PageHeader
        eyebrow={`${p.curso_nome} · aberto em ${dataCurta(p.aberto_em)}`}
        title={`Pedido de ${p.tipo ? TIPO_DESLIGAMENTO[p.tipo].toLowerCase() : "desligamento"} · ${p.codigo}`}
        actions={
          <ButtonLink href="/desligamentos" variant="secondary">
            Voltar para os pedidos
          </ButtonLink>
        }
      />

      <Panel title="Pedido">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Dado rotulo="Situação" valor={p.status ? STATUS_PEDIDO[p.status] : "—"} />
          <Dado rotulo="Origem" valor={p.origem === "manual" ? "Registro manual" : "Sistema acadêmico"} />
          <div>
            <dt className="label-caps text-muted">Risco no momento do pedido</dt>
            <dd className="mt-1">
              {p.faixa_no_pedido ? (
                <Badge tone={FAIXA[p.faixa_no_pedido].tone} dot>
                  {FAIXA[p.faixa_no_pedido].label}
                </Badge>
              ) : (
                <Badge>Sem avaliação</Badge>
              )}
            </dd>
            <dd className="text-xs leading-4 text-muted">
              {p.sinalizado_previamente ? "Sinalizado pelo modelo antes do pedido" : "Não sinalizado antes do pedido"}
            </dd>
          </div>
          <Dado
            rotulo="Questionário"
            valor={`${p.questionario_status ? STATUS_QUESTIONARIO[p.questionario_status] : "—"}${p.enviadoEm ? ` em ${dataCurta(p.enviadoEm)}` : ""}`}
          />
        </dl>
        <p className="mt-4 text-[13px] leading-5 text-muted">
          O risco registrado é o da última avaliação anterior ao pedido e não é alterado por avaliações posteriores.
        </p>
      </Panel>

      <Panel title="Respostas do questionário">
        {p.questionario_status !== "enviado" ? (
          <EmptyState title="O questionário não foi respondido." />
        ) : !p.respostas.autorizado ? (
          <EmptyState title="Você não tem autorização para ver respostas individuais.">
            As respostas entram nos indicadores agregados. A autorização para leitura individual é concedida pela gestão.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="label-caps mb-1 text-muted">Motivos</h3>
              <p>
                {p.respostas.motivos.length ? p.respostas.motivos.map((m) => MOTIVO[m]).join(", ") : "—"}
                {typeof outro === "string" ? ` (${outro})` : ""}
              </p>
            </div>
            {contexto.length > 0 && (
              <div>
                <h3 className="label-caps mb-1 text-muted">Contexto</h3>
                <ul className="flex flex-col gap-1">
                  {contexto.map((c) => (
                    <li key={c.pergunta}>
                      {c.pergunta} <span className="font-semibold">{c.resposta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="label-caps mb-1 text-muted">Reconsideraria com apoio</h3>
              <p>
                {p.reconsideraria ? RECONSIDERACAO[p.reconsideraria] : "Sem resposta"}
                {servicos && servicos.length > 0 ? `. Apoios de interesse: ${servicos.map((s) => s.nome).join(", ")}` : ""}
              </p>
            </div>
            {typeof comentario === "string" && (
              <div>
                <h3 className="label-caps mb-1 text-muted">Comentário</h3>
                <p className="text-body">{comentario}</p>
              </div>
            )}
            <p className="rounded-control bg-canvas px-3 py-2 text-[13px] leading-5 text-muted">
              Informações de saúde nunca são exibidas individualmente. Esta leitura foi registrada na auditoria da
              instituição. Use as respostas apenas para oferecer apoio ao aluno.
            </p>
          </div>
        )}
      </Panel>
    </>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-muted">{rotulo}</dt>
      <dd className="mt-1 font-semibold">{valor}</dd>
    </div>
  );
}
