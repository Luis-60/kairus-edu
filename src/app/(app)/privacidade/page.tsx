import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ResponderPedidoForm } from "@/features/privacidade/forms";
import { requirePapel } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dataCurta } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos de privacidade" };

const TIPO: Record<string, string> = { acesso: "Acesso aos dados", correcao: "Correção", exclusao: "Exclusão", outro: "Outro" };

/** Pedidos de titular (LGPD) dos alunos, respondidos pela gestão da instituição. */
export default async function PrivacidadePage() {
  await requirePapel("gestor");
  const supabase = await createClient();
  const { data: pedidos, error } = await supabase
    .from("pedidos_titular")
    .select("id, perfil_id, tipo, mensagem, status, resposta, created_at")
    .order("status")
    .order("created_at", { ascending: false });

  // Identificação pelo código de matrícula (a gestão não lê o nome dos alunos).
  const ids = [...new Set((pedidos ?? []).map((p) => p.perfil_id))];
  const { data: estudantes } = ids.length
    ? await supabase.from("estudantes").select("perfil_id, codigo").in("perfil_id", ids)
    : { data: [] };
  const codigo = new Map((estudantes ?? []).map((e) => [e.perfil_id, e.codigo]));

  return (
    <>
      <PageHeader eyebrow="LGPD" title="Pedidos de privacidade" />
      <p className="max-w-200 text-[13px] leading-5 text-muted">
        Pedidos de acesso, correção e exclusão feitos pelos alunos em Meus dados. Cada alteração fica registrada na
        auditoria. Responda pelo campo abaixo de cada pedido; o aluno lê a resposta no portal.
      </p>
      <Panel>
        {error ? (
          <ErrorState />
        ) : !pedidos || pedidos.length === 0 ? (
          <EmptyState title="Nenhum pedido recebido." />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {pedidos.map((p) => (
              <li key={p.id} className="grid grid-cols-1 gap-4 py-5 first:pt-0 lg:grid-cols-[2fr_3fr]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{codigo.get(p.perfil_id) ?? "Usuário"}</span>
                    <Badge tone={p.status === "concluido" ? "ok" : p.status === "aberto" ? "warn" : "info"}>{TIPO[p.tipo]}</Badge>
                  </div>
                  <div className="text-xs leading-4 text-muted">Recebido em {dataCurta(p.created_at)}</div>
                  <p className="mt-2 text-body">{p.mensagem}</p>
                </div>
                <ResponderPedidoForm id={p.id} status={p.status} resposta={p.resposta} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
