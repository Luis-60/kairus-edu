"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Label, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { gerarVersao, salvarRascunho, type ArquivoResultado } from "./arquivo-actions";
import { TITULO_SECAO, verificarConteudo, type Conteudo, type ItemConteudo, type Secao } from "./conteudo";
import { gerarRascunho } from "./ia-actions";

type Analise = { id: string; titulo: string };
type ListaSecao = "formacao" | "experiencia" | "projetos" | "atividades" | "certificacoes";
const LISTAS: ListaSecao[] = ["formacao", "experiencia", "projetos", "atividades", "certificacoes"];

const NIVEL_TOM = { critico: "danger", alto: "warn", medio: "neutral" } as const;
const NIVEL_ROTULO = { critico: "Crítico", alto: "Importante", medio: "Recomendado" } as const;

export function GerarRascunho({ analises, temRascunho }: { analises: Analise[]; temRascunho: boolean }) {
  const router = useRouter();
  const [analiseId, setAnaliseId] = useState("");
  const [msg, setMsg] = useState<{ tom: "error" | "success"; texto: string } | null>(null);
  const [pendente, start] = useTransition();
  const [confirmar, setConfirmar] = useState(false);

  const gerar = () =>
    start(async () => {
      setConfirmar(false);
      const r = await gerarRascunho(analiseId ? { analiseId } : {});
      setMsg({ tom: r.status === "error" ? "error" : "success", texto: r.message ?? "" });
      if (r.status === "success") router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {analises.length > 0 && (
          <div className="flex min-w-60 flex-col gap-1.5">
            <Label htmlFor="rascunho-vaga">Adaptar para uma vaga analisada (opcional)</Label>
            <Select id="rascunho-vaga" value={analiseId} onChange={(e) => setAnaliseId(e.target.value)}>
              <option value="">Currículo geral</option>
              {analises.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.titulo}
                </option>
              ))}
            </Select>
          </div>
        )}
        {temRascunho && !confirmar ? (
          <Button variant="secondary" onClick={() => setConfirmar(true)}>
            Gerar de novo com IA
          </Button>
        ) : (
          <Button pending={pendente} onClick={gerar}>
            {pendente ? "Montando o currículo…" : temRascunho ? "Sim, substituir o rascunho atual" : "Gerar rascunho com IA"}
          </Button>
        )}
        {confirmar && (
          <Button variant="ghost" onClick={() => setConfirmar(false)}>
            Cancelar
          </Button>
        )}
      </div>
      {confirmar && <p className="text-[13px] leading-5 text-warn">As edições que você fez no rascunho atual serão substituídas.</p>}
      {msg && <FormMessage tone={msg.tom}>{msg.texto}</FormMessage>}
      <p className="text-[13px] leading-5 text-muted">
        Entram só dados que você informou e competências que você confirmou. A IA reescreve o resumo e os tópicos; ela não
        acrescenta qualificações, números ou palavras-chave que você não demonstrou.
      </p>
    </div>
  );
}

export function EditorCurriculo({ inicial, analises }: { inicial: Conteudo; analises: Analise[] }) {
  const [c, setC] = useState<Conteudo>(inicial);
  const [salvoBase, setSalvoBase] = useState(JSON.stringify(inicial));
  const [msg, setMsg] = useState<{ tom: "error" | "success"; texto: string } | null>(null);
  const [salvando, start] = useTransition();
  const sujo = JSON.stringify(c) !== salvoBase;
  const pendencias = useMemo(() => verificarConteudo(c), [c]);

  const salvar = () =>
    start(async () => {
      const r = await salvarRascunho(c);
      setMsg({ tom: r.status === "error" ? "error" : "success", texto: r.message ?? "" });
      if (r.status === "success") setSalvoBase(JSON.stringify(c));
    });

  const mover = (i: number, d: -1 | 1) =>
    setC((x) => {
      const s = [...x.secoes];
      const j = i + d;
      if (j < 0 || j >= s.length) return x;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...x, secoes: s };
    });

  const atualizarItem = (secao: ListaSecao, id: string, campos: Partial<ItemConteudo>) =>
    setC((x) => ({ ...x, [secao]: x[secao].map((it) => (it.id === id ? { ...it, ...campos } : it)) }));
  const removerItem = (secao: ListaSecao, id: string) => setC((x) => ({ ...x, [secao]: x[secao].filter((it) => it.id !== id) }));

  return (
    <div className="flex flex-col gap-6">
      {pendencias.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="label-caps mb-2 text-muted">Antes de exportar</div>
          <ul className="flex flex-col gap-1.5">
            {pendencias.map((p) => (
              <li key={p.texto} className="flex items-start gap-2 text-[13px] leading-5">
                <Badge tone={NIVEL_TOM[p.nivel]}>{NIVEL_ROTULO[p.nivel]}</Badge>
                <span>{p.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
            <legend className="px-1 font-bold">Cabeçalho</legend>
            <Field id="ed-nome" label="Nome">
              <Input id="ed-nome" value={c.nome} maxLength={120} onChange={(e) => setC({ ...c, nome: e.target.value })} />
            </Field>
            <Field id="ed-titulo" label="Título profissional">
              <Input id="ed-titulo" value={c.titulo} maxLength={160} onChange={(e) => setC({ ...c, titulo: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["email", "telefone", "cidade", "linkedin", "portfolio"] as const).map((k) => (
                <Field key={k} id={`ed-${k}`} label={{ email: "E-mail", telefone: "Telefone", cidade: "Cidade e estado", linkedin: "LinkedIn", portfolio: "Portfólio" }[k]}>
                  <Input id={`ed-${k}`} value={c.contato[k]} maxLength={254} onChange={(e) => setC({ ...c, contato: { ...c.contato, [k]: e.target.value } })} />
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
            <legend className="px-1 font-bold">Ordem das seções</legend>
            <ol className="flex flex-col gap-1.5">
              {c.secoes.map((s, i) => (
                <li key={s} className="flex items-center justify-between gap-2 rounded-control bg-canvas px-3 py-1.5">
                  <span className="text-[13px] leading-5 font-semibold">{TITULO_SECAO[s]}</span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir ${TITULO_SECAO[s]}`}>
                      ↑
                    </Button>
                    <Button size="sm" variant="ghost" disabled={i === c.secoes.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer ${TITULO_SECAO[s]}`}>
                      ↓
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          </fieldset>

          <Field id="ed-resumo" label={TITULO_SECAO.resumo} hint={`${c.resumo.length} de 900 caracteres`}>
            <Textarea id="ed-resumo" rows={4} maxLength={900} value={c.resumo} onChange={(e) => setC({ ...c, resumo: e.target.value })} />
          </Field>

          {LISTAS.map((secao) =>
            c[secao].length === 0 ? null : (
              <fieldset key={secao} className="flex flex-col gap-4 rounded-card border border-line p-4">
                <legend className="px-1 font-bold">{TITULO_SECAO[secao]}</legend>
                {c[secao].map((it) => (
                  <div key={it.id} className="flex flex-col gap-2 border-b border-line pb-4 last:border-0 last:pb-0">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
                      <Input aria-label="Título" value={it.titulo} maxLength={160} onChange={(e) => atualizarItem(secao, it.id, { titulo: e.target.value })} className="py-2" />
                      <Input aria-label="Período" placeholder="03/2024 – atual" value={it.periodo} maxLength={60} onChange={(e) => atualizarItem(secao, it.id, { periodo: e.target.value })} className="py-2" />
                    </div>
                    <Input aria-label="Subtítulo" placeholder="Organização" value={it.subtitulo} maxLength={200} onChange={(e) => atualizarItem(secao, it.id, { subtitulo: e.target.value })} className="py-2" />
                    <Textarea
                      aria-label={`Tópicos de ${it.titulo}, um por linha`}
                      rows={Math.max(2, it.topicos.length + 1)}
                      value={it.topicos.join("\n")}
                      onChange={(e) =>
                        atualizarItem(secao, it.id, {
                          topicos: e.target.value.split("\n").map((t) => t.slice(0, 260)).filter((t, i, a) => t.trim() || i === a.length - 1).slice(0, 8),
                        })
                      }
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs leading-4 text-muted">Um tópico por linha.</span>
                      <Button size="sm" variant="ghost" onClick={() => removerItem(secao, it.id)}>
                        Remover do currículo
                      </Button>
                    </div>
                  </div>
                ))}
              </fieldset>
            ),
          )}

          <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
            <legend className="px-1 font-bold">{TITULO_SECAO.habilidades}</legend>
            {(["tecnicas", "comportamentais"] as const).map((tipo) => (
              <div key={tipo}>
                <div className="label-caps mb-1 text-muted">{tipo === "tecnicas" ? "Técnicas" : "Comportamentais"}</div>
                {c.habilidades[tipo].length === 0 ? (
                  <p className="text-[13px] leading-5 text-muted">Nenhuma confirmada.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {c.habilidades[tipo].map((h) => (
                      <li key={h} className="inline-flex items-center gap-1 rounded-control bg-canvas pl-3 text-[13px] leading-5 font-semibold">
                        {h}
                        <button
                          type="button"
                          className="min-h-8 px-2 text-muted hover:text-danger"
                          aria-label={`Tirar ${h} do currículo`}
                          onClick={() => setC({ ...c, habilidades: { ...c.habilidades, [tipo]: c.habilidades[tipo].filter((x) => x !== h) } })}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <p className="text-xs leading-4 text-muted">Para incluir competências, confirme-as na aba Competências e gere o rascunho de novo.</p>
          </fieldset>

          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-canvas py-3">
            <Button onClick={salvar} pending={salvando} disabled={!sujo}>
              {salvando ? "Salvando…" : sujo ? "Salvar alterações" : "Tudo salvo"}
            </Button>
            {msg && <FormMessage tone={msg.tom}>{msg.texto}</FormMessage>}
          </div>
        </div>

        <div className="min-w-0 2xl:sticky 2xl:top-6">
          <div className="label-caps mb-2 text-muted">Pré-visualização</div>
          <Previa c={c} />
        </div>
      </div>

      <Exportar analises={analises} sujo={sujo} />
    </div>
  );
}

/** Espelho do PDF em HTML: coluna única, mesmos títulos e mesma ordem. */
function Previa({ c }: { c: Conteudo }) {
  const contato = [c.contato.email, c.contato.telefone, c.contato.cidade].filter(Boolean).join(" · ");
  const links = [c.contato.linkedin, c.contato.portfolio].filter(Boolean).join(" · ");
  return (
    <article className="rounded-card border border-line bg-white p-6 font-[Helvetica,Arial,sans-serif] text-[13px] leading-[1.4] text-[#111] shadow-card">
      <div className="text-xl font-bold">{c.nome}</div>
      {c.titulo && <div>{c.titulo}</div>}
      {contato && <div className="text-[#333]">{contato}</div>}
      {links && <div className="text-[#333]">{links}</div>}
      {c.secoes.map((s) => (
        <SecaoPrevia key={s} secao={s} c={c} />
      ))}
    </article>
  );
}

function SecaoPrevia({ secao, c }: { secao: Secao; c: Conteudo }) {
  let corpo: React.ReactNode = null;
  if (secao === "resumo") corpo = c.resumo ? <p>{c.resumo}</p> : null;
  else if (secao === "habilidades") {
    const { tecnicas, comportamentais } = c.habilidades;
    corpo =
      tecnicas.length || comportamentais.length ? (
        <>
          {tecnicas.length > 0 && <p>Técnicas: {tecnicas.join(", ")}</p>}
          {comportamentais.length > 0 && <p>Comportamentais: {comportamentais.join(", ")}</p>}
        </>
      ) : null;
  } else if (secao === "idiomas") corpo = c.idiomas.length ? <p>{c.idiomas.join(" · ")}</p> : null;
  else {
    const itens = c[secao as ListaSecao];
    corpo = itens.length
      ? itens.map((it) => (
          <div key={it.id} className="mb-2">
            <div className="flex justify-between gap-3">
              <span className="font-bold">{it.titulo}</span>
              {it.periodo && <span className="shrink-0 text-[#333]">{it.periodo}</span>}
            </div>
            {it.subtitulo && <div className="text-[#333]">{it.subtitulo}</div>}
            <ul className="list-disc pl-4">
              {it.topicos.filter((t) => t.trim()).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ))
      : null;
  }
  if (!corpo) return null;
  return (
    <section className="mt-3">
      <h3 className="mb-1 border-b border-[#999] pb-0.5 text-[12px] font-bold tracking-wide uppercase">{TITULO_SECAO[secao]}</h3>
      {corpo}
    </section>
  );
}

function Exportar({ analises, sujo }: { analises: Analise[]; sujo: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(gerarVersao, { status: "idle" } as ArquivoResultado);
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state, router]);
  return (
    <section id="exportar" className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="text-lg leading-7 font-bold">Gerar PDF</h2>
      <p className="mb-4 text-[13px] leading-5 text-muted">
        O PDF é gerado no servidor, em coluna única e com texto selecionável, e passa automaticamente pelo scanner de leitura.
      </p>
      {sujo && <FormMessage tone="info">Salve as alterações antes de gerar o PDF.</FormMessage>}
      <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <Field id="versao-titulo" label="Nome desta versão">
            <Input id="versao-titulo" name="titulo" required maxLength={120} defaultValue="Currículo geral" className="py-2.5" />
          </Field>
        </div>
        <Field id="versao-modelo" label="Modelo">
          <Select id="versao-modelo" name="modelo" defaultValue="classico">
            <option value="classico">Clássico</option>
            <option value="compacto">Compacto (mais conteúdo por página)</option>
          </Select>
        </Field>
        {analises.length > 0 && (
          <Field id="versao-vaga" label="Conferir termos da vaga (opcional)">
            <Select id="versao-vaga" name="analiseId" defaultValue="">
              <option value="">Nenhuma</option>
              {analises.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.titulo}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button type="submit" pending={pending} disabled={sujo} className={cn(sujo && "opacity-60")}>
          {pending ? "Gerando PDF…" : "Gerar PDF"}
        </Button>
      </form>
      {state.status === "error" && state.message && (
        <div className="mt-3">
          <FormMessage tone="error">{state.message}</FormMessage>
        </div>
      )}
      {state.status === "success" && (
        <div className="mt-3">
          <FormMessage tone="success">PDF gerado. Ele está na lista de versões abaixo.</FormMessage>
        </div>
      )}
    </section>
  );
}
