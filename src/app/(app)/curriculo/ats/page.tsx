import type { Metadata } from "next";
import Link from "next/link";
import { Badge, type Tone } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState, Meter } from "@/components/ui/states";
import { CurriculoAbas } from "@/features/curriculo/abas";
import type { Prioridade, ResultadoScan } from "@/features/curriculo/ats";
import { AdaptarCurriculoButton, AnalisarVagaForm, EnviarCurriculoForm, ReanalisarForm } from "@/features/curriculo/ats-forms";
import type { ResultadoVaga } from "@/features/curriculo/ia-actions";
import { ListaArquivos } from "@/features/curriculo/lista-arquivos";
import { carregarPerfilCompleto } from "@/features/curriculo/queries";
import { requirePapel } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { dataCurta } from "@/lib/format";

export const metadata: Metadata = { title: "Scanner ATS" };

const PRIORIDADE: Record<Prioridade, { rotulo: string; tom: Tone }> = {
  critico: { rotulo: "Crítico", tom: "danger" },
  alto: { rotulo: "Alto", tom: "warn" },
  medio: { rotulo: "Médio", tom: "neutral" },
};

const SITUACAO = {
  confirmado: { rotulo: "Confirmado", tom: "ok" as Tone },
  parcial: { rotulo: "Parcial", tom: "warn" as Tone },
  nao_confirmado: { rotulo: "Não confirmado", tom: "neutral" as Tone },
};

function scanDe(v: unknown): ResultadoScan | null {
  return v && typeof v === "object" && "pontuacao" in v && "verificacoes" in v ? (v as ResultadoScan) : null;
}

export default async function AtsPage({ searchParams }: PageProps<"/curriculo/ats">) {
  const sessao = await requirePapel("estudante");
  const params = await searchParams;
  const r = await carregarPerfilCompleto(sessao.userId);
  if (!r.ok) return <ErrorState />;
  if (!r.data) return <EmptyState title="Sua matrícula ainda não está vinculada a esta conta." />;
  const p = r.data;

  const supabase = await createClient();
  const { data: vagas } = await supabase
    .from("vagas")
    .select("id, titulo, empresas(nome)")
    .eq("curso_id", p.estudante.cursoId)
    .eq("ativa", true)
    .order("titulo");
  const analises = p.analises.map((a) => ({ id: a.id, titulo: a.titulo }));

  const arquivos = [
    ...p.versoes.map((v) => ({ tipo: "versao" as const, id: v.id, titulo: v.titulo, data: v.created_at, origem: "Gerado no KairusEdu", scan: scanDe(v.scan) })),
    ...p.enviados.map((e) => ({ tipo: "enviado" as const, id: e.id, titulo: e.nome_exibicao, data: e.created_at, origem: `Enviado por você (${e.formato.toUpperCase()})`, scan: scanDe(e.scan) })),
  ].sort((a, b) => b.data.localeCompare(a.data));
  const pedido = typeof params.arquivo === "string" ? params.arquivo.split(":") : [];
  const selecionado = arquivos.find((a) => a.tipo === pedido[0] && a.id === pedido[1]) ?? arquivos[0];

  const analiseSel = p.analises.find((a) => a.id === params.analise) ?? p.analises[0];
  const vaga = analiseSel ? (analiseSel.resultado as ResultadoVaga) : null;

  return (
    <>
      <PageHeader eyebrow="Currículo" title="Scanner ATS" />
      <CurriculoAbas atual="/curriculo/ats" />

      <p className="max-w-200 text-[13px] leading-5 text-muted">
        Dois indicadores separados: <span className="font-semibold text-navy">leitura por ATS</span> (se um sistema de
        recrutamento consegue ler o currículo corretamente) e <span className="font-semibold text-navy">aderência à vaga</span>{" "}
        (quanto suas qualificações confirmadas atendem a uma vaga). São estimativas do KairusEdu, não notas de um ATS real, e
        não garantem aprovação: cada empresa usa um sistema e critérios próprios.
      </p>

      <Panel title="Leitura por ATS" description="Analise um PDF gerado aqui ou envie o currículo que você já tem.">
        <EnviarCurriculoForm analises={analises} />

        {arquivos.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="Nenhum currículo analisado ainda.">
              Envie um arquivo acima ou{" "}
              <Link href="/curriculo/editor" className="font-semibold text-primary hover:text-primary-hover">
                gere um PDF no KairusEdu
              </Link>
              .
            </EmptyState>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[2fr_3fr]">
            <nav aria-label="Currículos analisados">
              <ul className="flex flex-col gap-2">
                {arquivos.map((a) => {
                  const ativo = a === selecionado;
                  return (
                    <li key={`${a.tipo}-${a.id}`}>
                      <Link
                        href={`/curriculo/ats?arquivo=${a.tipo}:${a.id}`}
                        scroll={false}
                        aria-current={ativo ? "true" : undefined}
                        className={cn("flex items-center justify-between gap-3 rounded-card border p-3 hover:border-primary", ativo ? "border-2 border-primary" : "border-line")}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{a.titulo}</span>
                          <span className="block text-xs leading-4 text-muted">
                            {a.origem} · {dataCurta(a.data)}
                          </span>
                        </span>
                        {a.scan && <span className="tabular shrink-0 text-lg font-extrabold">{a.scan.pontuacao}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {selecionado?.scan && (
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="label-caps text-muted">Leitura por ATS (estimativa)</div>
                    <div className="tabular text-[32px] leading-10 font-extrabold">{selecionado.scan.pontuacao}/100</div>
                    <div className="text-[13px] leading-5 text-muted">
                      {selecionado.scan.paginas} {selecionado.scan.paginas === 1 ? "página" : "páginas"} · {selecionado.scan.palavras} palavras lidas
                    </div>
                  </div>
                  <ReanalisarForm tipo={selecionado.tipo} id={selecionado.id} analises={analises} />
                </div>
                <Meter
                  value={selecionado.scan.pontuacao}
                  fillClassName={selecionado.scan.pontuacao >= 80 ? "bg-ok" : selecionado.scan.pontuacao >= 60 ? "bg-warn-fill" : "bg-danger"}
                  trackClassName="bg-line"
                />
                <ul className="flex flex-col divide-y divide-line">
                  {[...selecionado.scan.verificacoes]
                    .sort((a, b) => Number(a.ok) - Number(b.ok))
                    .map((v) => (
                      <li key={v.id} className="flex items-start gap-3 py-3">
                        <span aria-hidden className={cn("mt-0.5 font-bold", v.ok ? "text-ok" : "text-danger")}>
                          {v.ok ? "✓" : "✗"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{v.titulo}</span>
                            <span className="sr-only">{v.ok ? "aprovado" : "precisa de ajuste"}</span>
                            {!v.ok && <Badge tone={PRIORIDADE[v.prioridade].tom}>{PRIORIDADE[v.prioridade].rotulo}</Badge>}
                          </div>
                          <p className="text-[13px] leading-5 text-body">{v.detalhe}</p>
                        </div>
                      </li>
                    ))}
                </ul>
                {selecionado.scan.termosVaga && (
                  <div className="rounded-card bg-canvas p-4">
                    <div className="label-caps mb-1 text-muted">Termos da vaga no texto: {selecionado.scan.termosVaga.vaga}</div>
                    <p className="text-[13px] leading-5">
                      <span className="font-semibold text-ok">Encontrados:</span> {selecionado.scan.termosVaga.encontrados.join(", ") || "nenhum"}
                    </p>
                    <p className="text-[13px] leading-5">
                      <span className="font-semibold text-muted">Ausentes:</span> {selecionado.scan.termosVaga.ausentes.join(", ") || "nenhum"}
                    </p>
                    <p className="mt-1 text-xs leading-4 text-muted">
                      Só inclua um termo ausente se você realmente tiver essa qualificação. Repetir palavras sem evidência
                      prejudica a leitura por recrutadores.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {arquivos.length > 0 && (
          <details className="mt-6 border-t border-line pt-4">
            <summary className="cursor-pointer font-semibold">Gerenciar arquivos</summary>
            <div className="mt-3">
              <ListaArquivos
                vazio=""
                itens={arquivos.map((a) => ({
                  id: a.id,
                  tipo: a.tipo,
                  titulo: a.titulo,
                  detalhe: `${a.origem} · ${dataCurta(a.data)}`,
                  pontuacao: a.scan?.pontuacao ?? null,
                }))}
              />
            </div>
          </details>
        )}
      </Panel>

      <Panel id="aderencia" title="Aderência à vaga" description="Compara os requisitos da vaga só com o que você confirmou no seu perfil.">
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[2fr_3fr]">
          <div className="flex min-w-0 flex-col gap-5">
            <AnalisarVagaForm
              vagas={(vagas ?? []).map((v) => ({ id: v.id, titulo: `${v.titulo}${v.empresas?.nome ? ` · ${v.empresas.nome}` : ""}` }))}
            />
            {p.analises.length > 0 && (
              <nav aria-label="Análises anteriores">
                <div className="label-caps mb-2 text-muted">Análises anteriores</div>
                <ul className="flex flex-col gap-1">
                  {p.analises.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/curriculo/ats?analise=${a.id}#aderencia`}
                        scroll={false}
                        aria-current={a.id === analiseSel?.id ? "true" : undefined}
                        className={cn("flex justify-between gap-2 rounded-control px-3 py-2 text-[13px] leading-5", a.id === analiseSel?.id ? "bg-tint font-semibold text-primary" : "hover:bg-canvas")}
                      >
                        <span className="truncate">{a.titulo}</span>
                        <span className="tabular shrink-0">{(a.resultado as ResultadoVaga).aderencia}%</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          {vaga && analiseSel ? (
            <div className="flex min-w-0 flex-col gap-4">
              <div>
                <div className="label-caps text-muted">Aderência à vaga (estimativa)</div>
                <div className="font-bold">{vaga.cargo}</div>
                <div className="tabular text-[32px] leading-10 font-extrabold text-primary">{vaga.aderencia}%</div>
                <Meter value={vaga.aderencia} trackClassName="bg-line" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 border-collapse">
                  <thead>
                    <tr className="label-caps text-left text-muted">
                      <th scope="col" className="border-b border-line px-2 py-2">Requisito</th>
                      <th scope="col" className="border-b border-line px-2 py-2">Seu perfil</th>
                      <th scope="col" className="border-b border-line px-2 py-2">Evidência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaga.requisitos.map((req) => (
                      <tr key={req.nome}>
                        <td className="border-b border-line px-2 py-2.5 align-top">
                          <div className="font-semibold">{req.nome}</div>
                          <div className="text-xs leading-4 text-muted">{req.tipo === "obrigatorio" ? "obrigatório" : "desejável"}</div>
                        </td>
                        <td className="border-b border-line px-2 py-2.5 align-top">
                          <Badge tone={SITUACAO[req.situacao].tom}>{SITUACAO[req.situacao].rotulo}</Badge>
                        </td>
                        <td className="border-b border-line px-2 py-2.5 align-top text-[13px] leading-5 text-body">
                          {req.evidencias.length ? req.evidencias.join("; ") : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="rounded-card bg-canvas p-4 text-body">{vaga.recomendacao}</p>
              <AdaptarCurriculoButton analiseId={analiseSel.id} />
            </div>
          ) : (
            <EmptyState title="Nenhuma vaga analisada ainda.">Escolha uma vaga ou cole uma descrição para comparar com o seu perfil.</EmptyState>
          )}
        </div>
      </Panel>
    </>
  );
}
