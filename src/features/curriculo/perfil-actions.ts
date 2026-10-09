"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type FormResultado = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const SEM_PERMISSAO: FormResultado = { status: "error", message: "Você não tem permissão para esta operação." };

/** Estudante da sessão (a RLS garante que só o próprio registro é lido). */
async function estudanteDaSessao() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return null;
  const supabase = await createClient();
  const { data } = await supabase.from("estudantes").select("id, instituicao_id").eq("perfil_id", sessao.userId).maybeSingle();
  return data ? { supabase, estudanteId: data.id, instituicaoId: data.instituicao_id } : null;
}

function errosDeCampo(issues: { path: PropertyKey[]; message: string }[]): FormResultado {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const campo = String(issue.path[0] ?? "");
    if (campo && !fieldErrors[campo]) fieldErrors[campo] = issue.message;
  }
  return { status: "error", fieldErrors };
}

function revalidar() {
  revalidatePath("/curriculo", "layout");
}

const vazio = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const opcional = (max: number, msg?: string) => z.preprocess(vazio, z.string().trim().max(max, msg).optional());
const mes = z.preprocess(vazio, z.string().regex(/^\d{4}-\d{2}$/, "Use mês e ano.").optional());
const paraData = (m?: string) => (m ? `${m}-01` : null);

// ---------------------------------------------------------------------------
// Perfil (objetivo, contato e formação)
// ---------------------------------------------------------------------------
const perfilSchema = z.object({
  etapa_atual: z.coerce.number().int().min(1).max(10).optional(),
  tipo_vaga: z.preprocess(vazio, z.enum(["estagio", "emprego", "trainee", "aprendiz"]).optional()),
  area_interesse: opcional(120),
  objetivo: opcional(600, "Use no máximo 600 caracteres."),
  email_contato: z.preprocess(vazio, z.email("Informe um e-mail válido.").max(254).optional()),
  telefone: z.preprocess(
    vazio,
    z.string().trim().regex(/^[\d\s()+-]{8,30}$/, "Use apenas números, espaços, parênteses e hífen.").optional(),
  ),
  cidade: opcional(80),
  linkedin: z.preprocess(
    vazio,
    z.string().trim().max(200).regex(/^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/\S+$/i, "Informe o endereço do seu perfil no LinkedIn.").optional(),
  ),
  portfolio: z.preprocess(vazio, z.url("Informe um endereço completo, com https://.").max(200).optional()),
  disciplinas_relevantes: opcional(600, "Use no máximo 600 caracteres."),
  conquistas_academicas: opcional(800, "Use no máximo 800 caracteres."),
  sem_experiencia: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).optional(),
});

/** Salva os campos enviados do perfil. Campos ausentes do formulário não são alterados. */
export async function salvarPerfil(_prev: FormResultado, formData: FormData): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;

  const entrada = Object.fromEntries(formData);
  const parsed = perfilSchema.safeParse(entrada);
  if (!parsed.success) return errosDeCampo(parsed.error.issues);

  // Só grava as chaves presentes no formulário; campo enviado vazio é apagado.
  const campos: Record<string, unknown> = {};
  for (const chave of Object.keys(perfilSchema.shape)) {
    if (chave in entrada) campos[chave] = (parsed.data as Record<string, unknown>)[chave] ?? null;
  }
  if ("sem_experiencia_presente" in entrada) campos.sem_experiencia = parsed.data.sem_experiencia ?? false;

  const { error } = await ctx.supabase
    .from("perfis_profissionais")
    .upsert({ estudante_id: ctx.estudanteId, instituicao_id: ctx.instituicaoId, ...campos }, { onConflict: "estudante_id" });
  if (error) {
    console.error("[curriculo] falha ao salvar perfil", error.code);
    return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  }
  revalidar();
  return { status: "success", message: "Salvo." };
}

// ---------------------------------------------------------------------------
// Experiências (trabalho, informal, voluntariado e atividades)
// ---------------------------------------------------------------------------
const experienciaSchema = z
  .object({
    id: z.preprocess(vazio, z.uuid().optional()),
    tipo: z.enum(["formal", "estagio", "freelance", "negocio_familiar", "informal", "voluntario", "atividade"], {
      error: "Escolha o tipo.",
    }),
    cargo: z.string().trim().min(2, "Informe o papel ou cargo.").max(120),
    organizacao: opcional(160),
    inicio: mes,
    fim: mes,
    atual: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    atividades: z.string().trim().min(10, "Descreva o que você fazia, com pelo menos 10 caracteres.").max(2000),
    ferramentas: opcional(400),
    resultados: opcional(800),
  })
  .refine((v) => !v.fim || !v.inicio || v.fim >= v.inicio, { path: ["fim"], message: "O fim deve ser depois do início." });

export async function salvarExperiencia(_prev: FormResultado, formData: FormData): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = experienciaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errosDeCampo(parsed.error.issues);
  const d = parsed.data;

  const registro = {
    estudante_id: ctx.estudanteId,
    instituicao_id: ctx.instituicaoId,
    tipo: d.tipo,
    cargo: d.cargo,
    organizacao: d.organizacao ?? null,
    inicio: paraData(d.inicio),
    fim: d.atual ? null : paraData(d.fim),
    atual: d.atual,
    atividades: d.atividades,
    ferramentas: d.ferramentas ?? null,
    resultados: d.resultados ?? null,
  };
  const { error } = d.id
    ? await ctx.supabase.from("experiencias").update(registro).eq("id", d.id)
    : await ctx.supabase.from("experiencias").insert(registro);
  if (error) {
    console.error("[curriculo] falha ao salvar experiência", error.code);
    return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  }
  revalidar();
  return { status: "success", message: "Experiência salva." };
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------
const projetoSchema = z.object({
  id: z.preprocess(vazio, z.uuid().optional()),
  titulo: z.string().trim().min(2, "Dê um nome ao projeto.").max(160),
  problema: opcional(800),
  acoes: z.string().trim().min(10, "Conte o que você fez, com pelo menos 10 caracteres.").max(1500),
  ferramentas: opcional(400),
  resultado: opcional(800),
  inicio: mes,
  fim: mes,
  link: z.preprocess(vazio, z.url("Informe um endereço completo, com https://.").max(300).optional()),
});

export async function salvarProjeto(_prev: FormResultado, formData: FormData): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = projetoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errosDeCampo(parsed.error.issues);
  const d = parsed.data;

  const registro = {
    estudante_id: ctx.estudanteId,
    instituicao_id: ctx.instituicaoId,
    titulo: d.titulo,
    problema: d.problema ?? null,
    acoes: d.acoes,
    ferramentas: d.ferramentas ?? null,
    resultado: d.resultado ?? null,
    inicio: paraData(d.inicio),
    fim: paraData(d.fim),
    link: d.link ?? null,
  };
  const { error } = d.id
    ? await ctx.supabase.from("projetos").update(registro).eq("id", d.id)
    : await ctx.supabase.from("projetos").insert(registro);
  if (error) {
    console.error("[curriculo] falha ao salvar projeto", error.code);
    return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  }
  revalidar();
  return { status: "success", message: "Projeto salvo." };
}

// ---------------------------------------------------------------------------
// Certificações, idiomas e competências declaradas pelo próprio estudante
// ---------------------------------------------------------------------------
const certificacaoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do curso ou certificação.").max(160),
  emissor: opcional(160),
  concluido_em: mes,
  carga_horaria: z.preprocess(vazio, z.coerce.number().int().min(1).max(5000).optional()),
});

export async function salvarCertificacao(_prev: FormResultado, formData: FormData): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = certificacaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errosDeCampo(parsed.error.issues);
  const { error } = await ctx.supabase.from("certificacoes").insert({
    estudante_id: ctx.estudanteId,
    instituicao_id: ctx.instituicaoId,
    nome: parsed.data.nome,
    emissor: parsed.data.emissor ?? null,
    concluido_em: paraData(parsed.data.concluido_em),
    carga_horaria: parsed.data.carga_horaria ?? null,
  });
  if (error) return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  revalidar();
  return { status: "success", message: "Certificação incluída." };
}

const idiomaSchema = z.object({
  idioma: z.string().trim().min(2, "Informe o idioma.").max(60),
  nivel: z.enum(["basico", "intermediario", "avancado", "fluente", "nativo"], { error: "Escolha o nível." }),
});

export async function salvarIdioma(_prev: FormResultado, formData: FormData): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = idiomaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errosDeCampo(parsed.error.issues);
  const { error } = await ctx.supabase
    .from("idiomas")
    .upsert(
      { estudante_id: ctx.estudanteId, instituicao_id: ctx.instituicaoId, idioma: parsed.data.idioma, nivel: parsed.data.nivel },
      { onConflict: "estudante_id,idioma" },
    );
  if (error) return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  revalidar();
  return { status: "success", message: "Idioma salvo." };
}

const habilidadeSchema = z.object({
  nome: z.string().trim().min(2, "Informe a competência.").max(100),
  categoria: z.enum(["tecnica", "comportamental"]),
  evidencia: opcional(400),
});

/** Competência declarada pelo estudante: já entra confirmada (é ele quem afirma). */
export async function adicionarHabilidade(_prev: FormResultado, formData: FormData): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = habilidadeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errosDeCampo(parsed.error.issues);
  const { error } = await ctx.supabase.from("habilidades").insert({
    estudante_id: ctx.estudanteId,
    instituicao_id: ctx.instituicaoId,
    nome: parsed.data.nome,
    categoria: parsed.data.categoria,
    evidencia: parsed.data.evidencia ?? null,
    origem: "aluno",
    status: "confirmada",
  });
  if (error) {
    if (error.code === "23505") return { status: "error", fieldErrors: { nome: "Você já tem essa competência." } };
    return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  }
  revalidar();
  return { status: "success", message: "Competência incluída." };
}

const atualizarHabilidadeSchema = z.object({
  id: z.uuid(),
  status: z.enum(["sugerida", "confirmada", "rejeitada"]).optional(),
  nome: z.string().trim().min(2).max(100).optional(),
  categoria: z.enum(["tecnica", "comportamental"]).optional(),
  evidencia: z.string().trim().max(400).optional(),
});

/** Confirmar, rejeitar ou editar uma competência. Só o estudante faz isso (RLS). */
export async function atualizarHabilidade(entrada: z.infer<typeof atualizarHabilidadeSchema>): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = atualizarHabilidadeSchema.safeParse(entrada);
  if (!parsed.success) return { status: "error", message: "Dados inválidos." };
  const { id, ...campos } = parsed.data;
  const { data, error } = await ctx.supabase.from("habilidades").update(campos).eq("id", id).select("id").maybeSingle();
  if (error || !data) {
    if (error?.code === "23505") return { status: "error", message: "Você já tem uma competência com esse nome." };
    return { status: "error", message: "Não foi possível atualizar." };
  }
  revalidar();
  return { status: "success" };
}

const TABELAS_EXCLUIVEIS = ["experiencias", "projetos", "certificacoes", "idiomas", "habilidades"] as const;

export async function excluirItem(tabela: (typeof TABELAS_EXCLUIVEIS)[number], id: string): Promise<FormResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  if (!TABELAS_EXCLUIVEIS.includes(tabela) || !z.uuid().safeParse(id).success) return SEM_PERMISSAO;
  const { error } = await ctx.supabase.from(tabela).delete().eq("id", id);
  if (error) return { status: "error", message: "Não foi possível excluir." };
  revalidar();
  return { status: "success" };
}
