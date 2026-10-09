import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CurriculoAbas } from "@/features/curriculo/abas";
import { CompetenciaItem } from "@/features/curriculo/competencia-item";
import { AnalisarButton, HabilidadeForm } from "@/features/curriculo/forms";
import { carregarPerfilCompleto } from "@/features/curriculo/queries";
import { requirePapel } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Competências" };

export default async function CompetenciasPage() {
  const sessao = await requirePapel("estudante");
  const r = await carregarPerfilCompleto(sessao.userId);
  if (!r.ok) return <ErrorState />;
  if (!r.data) return <EmptyState title="Sua matrícula ainda não está vinculada a esta conta." />;
  const p = r.data;

  const sugeridas = p.habilidades.filter((h) => h.status === "sugerida");
  const confirmadas = p.habilidades.filter((h) => h.status === "confirmada");
  const rejeitadas = p.habilidades.filter((h) => h.status === "rejeitada");
  const perguntas = Array.isArray(p.perfil?.perguntas_ia) ? (p.perfil.perguntas_ia as { item_id?: string; pergunta?: string }[]) : [];
  const nomeItem = (id?: string) =>
    p.experiencias.find((e) => e.id === id)?.cargo ?? p.projetos.find((x) => x.id === id)?.titulo ?? "item";
  const etapaItem = (id?: string) => {
    const e = p.experiencias.find((x) => x.id === id);
    return e && !["atividade", "voluntario"].includes(e.tipo) ? 4 : 5;
  };

  return (
    <>
      <PageHeader eyebrow="Currículo" title="Competências" />
      <CurriculoAbas atual="/curriculo/competencias" />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            title="Competências que identificamos nas suas experiências"
            description="São sugestões. Confirme só o que for verdade; você pode editar o nome ou descartar."
          >
            {sugeridas.length === 0 ? (
              <EmptyState title="Nenhuma sugestão aguardando você.">
                {p.experiencias.length + p.projetos.length === 0 ? (
                  <>
                    Conte suas experiências e projetos no{" "}
                    <Link href="/curriculo/perfil?etapa=4" className="font-semibold text-primary hover:text-primary-hover">
                      perfil profissional
                    </Link>{" "}
                    para a IA sugerir competências.
                  </>
                ) : (
                  "Rode a análise de novo depois de contar mais experiências."
                )}
              </EmptyState>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {sugeridas.map((h) => (
                  <CompetenciaItem key={h.id} h={h} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Confirmadas" description="Só estas entram no currículo e na análise de vagas.">
            {confirmadas.length === 0 && p.reconhecidasPelaInstituicao.length === 0 ? (
              <EmptyState title="Nenhuma competência confirmada ainda." />
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-line">
                  {confirmadas.map((h) => (
                    <CompetenciaItem key={h.id} h={h} />
                  ))}
                </ul>
                {p.reconhecidasPelaInstituicao.length > 0 && (
                  <div className="mt-4 rounded-card bg-canvas p-4">
                    <div className="label-caps mb-1 text-muted">Reconhecidas pela instituição</div>
                    <p className="text-[13px] leading-5 text-body">{p.reconhecidasPelaInstituicao.join(", ")}</p>
                    <p className="mt-1 text-xs leading-4 text-muted">A partir das disciplinas e atividades concluídas no curso.</p>
                  </div>
                )}
              </>
            )}
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 font-semibold">Incluir outra competência</h3>
              <HabilidadeForm />
            </div>
          </Panel>

          {rejeitadas.length > 0 && (
            <Panel title="Descartadas" description="Não entram no currículo. Restaure se mudar de ideia.">
              <ul className="flex flex-col divide-y divide-line">
                {rejeitadas.map((h) => (
                  <CompetenciaItem key={h.id} h={h} />
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Perguntas para completar seu perfil" description="A IA notou que faltam detalhes importantes.">
            {perguntas.length === 0 ? (
              <EmptyState title="Nenhuma pergunta pendente." />
            ) : (
              <ul className="flex flex-col gap-3">
                {perguntas.map((q, i) => (
                  <li key={i} className="rounded-card bg-tint p-4">
                    <div className="font-semibold">{q.pergunta}</div>
                    <div className="mt-1 text-[13px] leading-5 text-muted">
                      Sobre: {nomeItem(q.item_id)} ·{" "}
                      <Link href={`/curriculo/perfil?etapa=${etapaItem(q.item_id)}`} className="font-semibold text-primary hover:text-primary-hover">
                        Responder editando o item
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Nova análise">
            <AnalisarButton rotulo="Analisar de novo com IA" />
          </Panel>

          <ButtonLink href="/curriculo/editor" className="self-start">
            Montar o currículo →
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
