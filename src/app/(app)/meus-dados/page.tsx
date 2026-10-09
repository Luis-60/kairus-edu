import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { DownloadLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { ExcluirCarreira, PedidoTitularForm } from "@/features/privacidade/forms";
import { requirePapel } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dataCurta } from "@/lib/format";

export const metadata: Metadata = { title: "Meus dados" };

const TIPO: Record<string, string> = { acesso: "Acesso", correcao: "Correção", exclusao: "Exclusão", outro: "Outro" };
const STATUS: Record<string, { rotulo: string; tom: "warn" | "info" | "ok" }> = {
  aberto: { rotulo: "Aberto", tom: "warn" },
  em_andamento: { rotulo: "Em andamento", tom: "info" },
  concluido: { rotulo: "Concluído", tom: "ok" },
};

export default async function MeusDadosPage() {
  const sessao = await requirePapel("estudante");
  const supabase = await createClient();
  const { data: pedidos } = await supabase
    .from("pedidos_titular")
    .select("id, tipo, mensagem, status, resposta, created_at")
    .eq("perfil_id", sessao.userId)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader eyebrow={sessao.instituicaoNome} title="Meus dados" />

      <Panel title="Como seus dados são usados" description="Cada finalidade usa só os dados necessários para ela.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-card bg-canvas p-4">
            <div className="font-bold">Acompanhamento acadêmico e permanência</div>
            <p className="mt-1 text-[13px] leading-5 text-body">
              Matrícula, frequência, notas e pedidos de trancamento ou cancelamento, usados pela instituição para oferecer
              apoio. A equipe identifica você por código. O questionário de desligamento é opcional, e respostas de saúde
              nunca são exibidas individualmente.
            </p>
          </div>
          <div className="rounded-card bg-canvas p-4">
            <div className="font-bold">Carreira e currículo</div>
            <p className="mt-1 text-[13px] leading-5 text-body">
              Perfil profissional, contato, currículos, arquivos e análises de vaga. Só você vê esses dados; a instituição
              recebe apenas totais agregados, sem identificação. Eles não são usados para decisões acadêmicas.
            </p>
          </div>
          <div className="rounded-card bg-canvas p-4">
            <div className="font-bold">Inteligência artificial</div>
            <p className="mt-1 text-[13px] leading-5 text-body">
              Quando você usa uma função de IA, enviamos apenas o texto necessário (experiências, projetos ou a vaga), nunca
              seu nome, matrícula ou contato. A IA sugere; você decide o que vale.
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-5 text-muted">
          As bases legais e os prazos de guarda são definidos pela sua instituição, que é a responsável pelos seus dados. Em
          caso de dúvida, use o formulário abaixo.
        </p>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Panel title="Baixar meus dados" description="Um arquivo com os seus dados acadêmicos, de permanência e de carreira.">
          <DownloadLink href="/meus-dados/exportar">Baixar meus dados (JSON)</DownloadLink>
          <p className="mt-3 text-[13px] leading-5 text-muted">
            Avaliações feitas pela instituição, como as de risco acadêmico, não aparecem no portal. Para recebê-las, faça um
            pedido de acesso.
          </p>
        </Panel>

        <Panel title="Excluir dados de carreira" description="Você pode apagar tudo o que criou na área de currículo.">
          <ExcluirCarreira />
        </Panel>

        <Panel title="Pedido sobre meus dados" description="Correção de dados acadêmicos, acesso completo, exclusão ou outra solicitação.">
          <PedidoTitularForm />
        </Panel>

        <Panel title="Meus pedidos">
          {!pedidos || pedidos.length === 0 ? (
            <EmptyState title="Você ainda não fez pedidos." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {pedidos.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 py-3 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {TIPO[p.tipo]} · {dataCurta(p.created_at)}
                    </span>
                    <Badge tone={STATUS[p.status].tom}>{STATUS[p.status].rotulo}</Badge>
                  </div>
                  <p className="text-[13px] leading-5 text-body">{p.mensagem}</p>
                  {p.resposta && (
                    <p className="rounded-control bg-tint p-3 text-[13px] leading-5">
                      <span className="font-semibold">Resposta da instituição:</span> {p.resposta}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
