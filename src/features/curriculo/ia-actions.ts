"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { gerarEstruturado, MENSAGEM_ERRO_IA } from "@/lib/ai/cliente";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { conteudoSchema, type Conteudo, type ItemConteudo, type Secao } from "./conteudo";
import { mesAno, periodo } from "./datas";
import {
  aderenciaSchema,
  competenciasSchema,
  curriculoSchema,
  requisitosSchema,
  SISTEMA_ADERENCIA,
  SISTEMA_COMPETENCIAS,
  SISTEMA_CURRICULO,
  SISTEMA_REQUISITOS,
} from "./prompts";
import { carregarPerfilCompleto, type PerfilCompleto } from "./queries";

export type IaResultado = { status: "idle" | "error" | "success"; message?: string; id?: string };

const SEM_PERMISSAO: IaResultado = { status: "error", message: "Você não tem permissão para esta operação." };

/** Normaliza para comparar trechos: minúsculas, sem acentos e espaços simples. */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textoExperiencia(e: PerfilCompleto["experiencias"][number]) {
  return [
    `Papel: ${e.cargo}`,
    e.organizacao ? `Onde: ${e.organizacao}` : "",
    `O que fazia: ${e.atividades}`,
    e.ferramentas ? `Ferramentas: ${e.ferramentas}` : "",
    e.resultados ? `Resultados: ${e.resultados}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function textoProjeto(p: PerfilCompleto["projetos"][number]) {
  return [
    `Projeto: ${p.titulo}`,
    p.problema ? `Problema: ${p.problema}` : "",
    `O que fez: ${p.acoes}`,
    p.ferramentas ? `Ferramentas: ${p.ferramentas}` : "",
    p.resultado ? `Resultado: ${p.resultado}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function contexto() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return null;
  const perfil = await carregarPerfilCompleto(sessao.userId);
  if (!perfil.ok || !perfil.data) return null;
  return { sessao, p: perfil.data };
}

// ===========================================================================
// 1. Extração de competências com evidência
// ===========================================================================
export async function analisarCompetencias(): Promise<IaResultado> {
  const ctx = await contexto();
  if (!ctx) return SEM_PERMISSAO;
  const { sessao, p } = ctx;

  const itens = [
    ...p.experiencias.map((e) => ({ id: e.id, texto: textoExperiencia(e) })),
    ...p.projetos.map((pr) => ({ id: pr.id, texto: textoProjeto(pr) })),
  ];
  if (itens.length === 0) {
    return { status: "error", message: "Cadastre ao menos uma experiência, atividade ou projeto antes da análise." };
  }

  const jaTem = p.habilidades.map((h) => h.nome);
  const resultado = await gerarEstruturado({
    funcao: "competencias",
    sessao,
    sistema: SISTEMA_COMPETENCIAS,
    conteudo: `Curso: ${p.estudante.curso}\n<ja_tem>${jaTem.join("; ") || "nenhuma"}</ja_tem>\n<itens>\n${itens
      .map((i) => `[item_id: ${i.id}]\n${i.texto}`)
      .join("\n\n")}\n</itens>`,
    schema: competenciasSchema,
    esforco: "medium",
  });
  if (!resultado.ok) return { status: "error", message: MENSAGEM_ERRO_IA[resultado.erro] };

  // Só aceita sugestões cuja evidência existe literalmente no item indicado.
  const porId = new Map(itens.map((i) => [i.id, normalizar(i.texto)]));
  const existentes = new Set(jaTem.map(normalizar));
  const novas = new Map<string, { nome: string; categoria: "tecnica" | "comportamental"; evidencia: string }>();
  for (const c of resultado.data.competencias) {
    const fonte = porId.get(c.item_id);
    const chave = normalizar(c.nome);
    if (!fonte || existentes.has(chave) || novas.has(chave)) continue;
    if (!fonte.includes(normalizar(c.evidencia))) continue;
    novas.set(chave, { nome: c.nome.trim(), categoria: c.categoria, evidencia: c.evidencia.trim() });
  }
  const perguntas = resultado.data.perguntas.filter((q) => porId.has(q.item_id));

  const supabase = await createClient();
  if (novas.size) {
    const { error } = await supabase.from("habilidades").insert(
      [...novas.values()].map((n) => ({
        estudante_id: p.estudante.id,
        instituicao_id: p.estudante.instituicaoId,
        nome: n.nome,
        categoria: n.categoria,
        evidencia: n.evidencia,
        origem: "ia" as const,
        status: "sugerida" as const,
      })),
    );
    if (error) {
      console.error("[curriculo] falha ao salvar sugestões", error.code);
      return { status: "error", message: "As sugestões foram geradas, mas não foi possível salvá-las." };
    }
  }
  await supabase
    .from("perfis_profissionais")
    .upsert(
      { estudante_id: p.estudante.id, instituicao_id: p.estudante.instituicaoId, perguntas_ia: perguntas },
      { onConflict: "estudante_id" },
    );

  revalidatePath("/curriculo", "layout");
  return {
    status: "success",
    message: novas.size
      ? `${novas.size} ${novas.size === 1 ? "competência sugerida" : "competências sugeridas"}. Confirme o que for verdade.`
      : "Nenhuma competência nova encontrada nas suas experiências.",
  };
}

// ===========================================================================
// 2. Geração do conteúdo do currículo (rascunho editável)
// ===========================================================================
const TIPO_EXPERIENCIA: Record<string, string> = {
  formal: "",
  estagio: "Estágio",
  freelance: "Trabalho autônomo",
  negocio_familiar: "Negócio familiar",
  informal: "Trabalho informal",
  voluntario: "Voluntariado",
  atividade: "Atividade",
};

const NIVEL_IDIOMA: Record<string, string> = {
  basico: "básico",
  intermediario: "intermediário",
  avancado: "avançado",
  fluente: "fluente",
  nativo: "nativo",
};

/** Tópicos sem IA: frases do próprio texto do estudante. */
function topicosDoTexto(...textos: (string | null | undefined)[]) {
  return textos
    .filter((t): t is string => Boolean(t))
    .flatMap((t) => t.split(/(?<=[.;!?])\s+|\n+/))
    .map((t) => t.trim().replace(/[.;]+$/, ""))
    .filter((t) => t.length >= 3)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .slice(0, 4);
}

function montarBase(p: PerfilCompleto, nome: string): Conteudo {
  const perfil = p.perfil;
  const confirmadas = p.habilidades.filter((h) => h.status === "confirmada");
  // O catálogo da instituição não tem categoria; competências interpessoais conhecidas vão para "comportamentais".
  const interpessoal = /comunica|equipe|lideran|organiza|negocia|empatia|atendimento|adapta/i;
  const daInstituicao = p.reconhecidasPelaInstituicao;
  const tecnicas = [...new Set([...confirmadas.filter((h) => h.categoria === "tecnica").map((h) => h.nome), ...daInstituicao.filter((n) => !interpessoal.test(n))])];
  const comportamentais = [...new Set([...confirmadas.filter((h) => h.categoria === "comportamental").map((h) => h.nome), ...daInstituicao.filter((n) => interpessoal.test(n))])];

  const item = (e: PerfilCompleto["experiencias"][number]): ItemConteudo => ({
    id: e.id,
    titulo: e.cargo,
    subtitulo: [e.organizacao, TIPO_EXPERIENCIA[e.tipo]].filter(Boolean).join(" · "),
    periodo: periodo(e.inicio, e.fim, e.atual),
    topicos: topicosDoTexto(e.atividades, e.resultados),
  });

  const experiencia = p.experiencias.filter((e) => !["voluntario", "atividade"].includes(e.tipo)).map(item);
  const atividades = p.experiencias.filter((e) => ["voluntario", "atividade"].includes(e.tipo)).map(item);
  const projetos: ItemConteudo[] = p.projetos.map((pr) => ({
    id: pr.id,
    titulo: pr.titulo,
    subtitulo: pr.ferramentas ? `Ferramentas: ${pr.ferramentas}` : "",
    periodo: periodo(pr.inicio, pr.fim),
    topicos: topicosDoTexto(pr.acoes, pr.resultado),
  }));

  const temExperiencia = experiencia.length > 0;
  // Sem experiência profissional, formação e projetos vêm primeiro.
  const ordem: Secao[] = temExperiencia
    ? ["resumo", "experiencia", "formacao", "projetos", "habilidades", "atividades", "certificacoes", "idiomas"]
    : ["resumo", "formacao", "projetos", "atividades", "habilidades", "certificacoes", "idiomas", "experiencia"];

  return {
    nome,
    titulo: [`Estudante de ${p.estudante.curso}`, perfil?.area_interesse].filter(Boolean).join(" | "),
    contato: {
      email: perfil?.email_contato ?? "",
      telefone: perfil?.telefone ?? "",
      cidade: perfil?.cidade ?? "",
      linkedin: perfil?.linkedin ?? "",
      portfolio: perfil?.portfolio ?? "",
    },
    resumo: "",
    secoes: ordem,
    formacao: [
      {
        id: "curso",
        titulo: `Bacharelado em ${p.estudante.curso}`,
        subtitulo: p.estudante.instituicao,
        periodo: p.estudante.previsaoConclusao ? `Previsão de conclusão: ${p.estudante.previsaoConclusao}` : "Em andamento",
        topicos: [
          `Cursando o ${p.estudante.periodoAtual}º de ${p.estudante.totalPeriodos} períodos`,
          ...(perfil?.disciplinas_relevantes ? [`Disciplinas relevantes: ${perfil.disciplinas_relevantes}`] : []),
          ...topicosDoTexto(perfil?.conquistas_academicas),
        ],
      },
    ],
    experiencia,
    projetos,
    atividades,
    habilidades: { tecnicas, comportamentais },
    certificacoes: p.certificacoes.map((c) => ({
      id: c.id,
      titulo: c.nome,
      subtitulo: [c.emissor, c.carga_horaria ? `${c.carga_horaria} h` : ""].filter(Boolean).join(" · "),
      periodo: mesAno(c.concluido_em),
      topicos: [],
    })),
    idiomas: p.idiomas.map((i) => `${i.idioma}: ${NIVEL_IDIOMA[i.nivel]}`),
    vagaAlvo: "",
  };
}

const gerarSchema = z.object({ analiseId: z.uuid().optional() });

/** Monta o rascunho com os dados confirmados; a IA só escreve resumo e tópicos. */
export async function gerarRascunho(entrada: z.infer<typeof gerarSchema> = {}): Promise<IaResultado> {
  const ctx = await contexto();
  if (!ctx) return SEM_PERMISSAO;
  const { sessao, p } = ctx;
  const parsed = gerarSchema.safeParse(entrada);
  if (!parsed.success) return SEM_PERMISSAO;

  const base = montarBase(p, sessao.nome);
  const analise = parsed.data.analiseId ? p.analises.find((a) => a.id === parsed.data.analiseId) : undefined;
  const requisitos = (analise?.resultado as { requisitos?: { nome: string }[] } | null)?.requisitos?.map((r) => r.nome) ?? [];
  if (analise) base.vagaAlvo = analise.titulo;

  const itens = [
    ...p.experiencias.map((e) => ({ id: e.id, texto: textoExperiencia(e) })),
    ...p.projetos.map((pr) => ({ id: pr.id, texto: textoProjeto(pr) })),
  ];

  const resultado = await gerarEstruturado({
    funcao: "curriculo",
    sessao,
    sistema: SISTEMA_CURRICULO,
    conteudo: `<dados>
Curso: ${p.estudante.curso}, ${p.estudante.periodoAtual}º de ${p.estudante.totalPeriodos} períodos
Objetivo: ${[p.perfil?.tipo_vaga, p.perfil?.area_interesse, p.perfil?.objetivo].filter(Boolean).join(" · ") || "não informado"}
Competências confirmadas: ${[...base.habilidades.tecnicas, ...base.habilidades.comportamentais].join("; ") || "nenhuma"}
${requisitos.length ? `Requisitos da vaga-alvo (${analise?.titulo}): ${requisitos.join("; ")}` : "Sem vaga-alvo"}
Itens:
${itens.map((i) => `[id: ${i.id}]\n${i.texto}`).join("\n\n") || "nenhum"}
</dados>`,
    schema: curriculoSchema,
  });

  let aviso: string | undefined;
  if (resultado.ok) {
    base.resumo = resultado.data.resumo;
    const porId = new Map(resultado.data.itens.map((i) => [i.id, i.topicos]));
    for (const lista of [base.experiencia, base.projetos, base.atividades]) {
      for (const it of lista) {
        const topicos = porId.get(it.id);
        if (topicos?.length) it.topicos = topicos.map((t) => t.trim()).slice(0, 5);
      }
    }
  } else {
    // Sem IA o rascunho continua útil: tópicos vêm do texto do próprio estudante.
    base.resumo = `Estudante do ${p.estudante.periodoAtual}º período de ${p.estudante.curso}${
      p.perfil?.area_interesse ? `, com interesse em ${p.perfil.area_interesse}` : ""
    }.`;
    aviso = `${MENSAGEM_ERRO_IA[resultado.erro]} O rascunho foi montado sem IA, com os seus próprios textos.`;
  }

  const validado = conteudoSchema.safeParse(base);
  if (!validado.success) return { status: "error", message: "Não foi possível montar o rascunho. Revise os dados do perfil." };

  const supabase = await createClient();
  const { error } = await supabase.from("perfis_profissionais").upsert(
    {
      estudante_id: p.estudante.id,
      instituicao_id: p.estudante.instituicaoId,
      rascunho: validado.data,
      rascunho_gerado_em: new Date().toISOString(),
    },
    { onConflict: "estudante_id" },
  );
  if (error) return { status: "error", message: "Não foi possível salvar o rascunho." };

  revalidatePath("/curriculo", "layout");
  return { status: "success", message: aviso ?? "Rascunho gerado. Revise e edite antes de exportar." };
}

// ===========================================================================
// 3. Análise de aderência a uma vaga
// ===========================================================================
const vagaSchema = z.discriminatedUnion("origem", [
  z.object({ origem: z.literal("vaga"), vagaId: z.uuid() }),
  z.object({
    origem: z.literal("colada"),
    descricao: z.string().trim().min(80, "Cole a descrição completa da vaga, com pelo menos 80 caracteres.").max(8000),
  }),
]);

export type Requisito = {
  nome: string;
  tipo: "obrigatorio" | "desejavel";
  situacao: "confirmado" | "parcial" | "nao_confirmado";
  evidencias: string[];
  comentario: string;
};

export type ResultadoVaga = { cargo: string; requisitos: Requisito[]; aderencia: number; recomendacao: string };

export async function analisarVaga(_prev: IaResultado, formData: FormData): Promise<IaResultado> {
  const ctx = await contexto();
  if (!ctx) return SEM_PERMISSAO;
  const { sessao, p } = ctx;

  const parsed = vagaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();

  let cargo = "";
  let descricao: string | null = null;
  let requisitos: { nome: string; tipo: "obrigatorio" | "desejavel" }[] = [];

  if (parsed.data.origem === "vaga") {
    const { data: vaga } = await supabase
      .from("vagas")
      .select("id, titulo, descricao, empresas(nome), vaga_competencias(competencias(nome))")
      .eq("id", parsed.data.vagaId)
      .maybeSingle();
    if (!vaga) return { status: "error", message: "Vaga não encontrada." };
    cargo = `${vaga.titulo}${vaga.empresas?.nome ? ` · ${vaga.empresas.nome}` : ""}`;
    descricao = vaga.descricao;
    requisitos = vaga.vaga_competencias.flatMap((vc) => (vc.competencias ? [{ nome: vc.competencias.nome, tipo: "obrigatorio" as const }] : []));
  } else {
    const extraido = await gerarEstruturado({
      funcao: "vaga",
      sessao,
      sistema: SISTEMA_REQUISITOS,
      conteudo: `<vaga>\n${parsed.data.descricao}\n</vaga>`,
      schema: requisitosSchema,
    });
    if (!extraido.ok) return { status: "error", message: MENSAGEM_ERRO_IA[extraido.erro] };
    cargo = extraido.data.cargo;
    descricao = parsed.data.descricao;
    requisitos = extraido.data.requisitos.map((r) => ({ nome: r.nome, tipo: r.tipo }));
  }
  if (requisitos.length === 0) return { status: "error", message: "A vaga não tem requisitos para comparar." };

  // Evidências verificadas do perfil (nunca sugestões não confirmadas).
  const evidencias = [
    ...p.habilidades
      .filter((h) => h.status === "confirmada")
      .map((h) => `Competência confirmada pelo estudante: ${h.nome}${h.evidencia ? ` (${h.evidencia})` : ""}`),
    ...p.reconhecidasPelaInstituicao.map((n) => `Competência reconhecida pela instituição: ${n}`),
    `Formação: cursando ${p.estudante.curso}, ${p.estudante.periodoAtual}º de ${p.estudante.totalPeriodos} períodos`,
    ...p.certificacoes.map((c) => `Certificação ou curso: ${c.nome}${c.emissor ? ` (${c.emissor})` : ""}`),
    ...p.idiomas.map((i) => `Idioma: ${i.idioma}, nível ${NIVEL_IDIOMA[i.nivel]}`),
    ...p.experiencias.map((e) => `Experiência: ${e.cargo}${e.ferramentas ? `; ferramentas: ${e.ferramentas}` : ""}`),
  ];
  const ids = evidencias.map((_, i) => `E${i + 1}`);

  const avaliado = await gerarEstruturado({
    funcao: "vaga",
    sessao,
    sistema: SISTEMA_ADERENCIA,
    conteudo: `<requisitos>\n${requisitos.map((r, i) => `R${i + 1}: ${r.nome} (${r.tipo})`).join("\n")}\n</requisitos>\n<perfil>\n${evidencias
      .map((e, i) => `${ids[i]}: ${e}`)
      .join("\n")}\n</perfil>`,
    schema: aderenciaSchema,
  });
  if (!avaliado.ok) return { status: "error", message: MENSAGEM_ERRO_IA[avaliado.erro] };

  const porRequisito = new Map(avaliado.data.avaliacoes.map((a) => [a.requisito, a]));
  const lista: Requisito[] = requisitos.map((r, i) => {
    const a = porRequisito.get(`R${i + 1}`);
    const validas = (a?.evidencias ?? []).filter((e) => ids.includes(e));
    // Sem evidência real, o requisito não conta como atendido.
    const situacao = a && validas.length > 0 ? a.situacao : "nao_confirmado";
    return {
      nome: r.nome,
      tipo: r.tipo,
      situacao,
      evidencias: validas.map((e) => evidencias[ids.indexOf(e)]),
      comentario: a?.comentario ?? "",
    };
  });

  const peso = (r: Requisito) => (r.tipo === "obrigatorio" ? 2 : 1);
  const total = lista.reduce((s, r) => s + peso(r), 0);
  const pontos = lista.reduce((s, r) => s + peso(r) * (r.situacao === "confirmado" ? 1 : r.situacao === "parcial" ? 0.5 : 0), 0);
  const confirmados = lista.filter((r) => r.situacao === "confirmado").map((r) => r.nome);
  const faltam = lista.filter((r) => r.situacao === "nao_confirmado").map((r) => r.nome);

  const resultado: ResultadoVaga = {
    cargo,
    requisitos: lista,
    aderencia: total ? Math.round((100 * pontos) / total) : 0,
    recomendacao: [
      confirmados.length ? `Seu perfil demonstra ${confirmados.join(", ")}.` : "Ainda não há requisitos confirmados no seu perfil.",
      faltam.length
        ? `A vaga também menciona ${faltam.join(", ")}, que não estão confirmados no seu perfil. Se você tem esses conhecimentos, inclua-os com evidências; se não, eles indicam o que estudar.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };

  const { data: salvo, error } = await supabase
    .from("analises_vaga")
    .insert({
      estudante_id: p.estudante.id,
      instituicao_id: p.estudante.instituicaoId,
      origem: parsed.data.origem,
      vaga_id: parsed.data.origem === "vaga" ? parsed.data.vagaId : null,
      titulo: cargo.slice(0, 160),
      descricao,
      resultado,
    })
    .select("id")
    .single();
  if (error) return { status: "error", message: "A análise foi feita, mas não foi possível salvá-la." };

  revalidatePath("/curriculo", "layout");
  return { status: "success", id: salvo.id };
}
