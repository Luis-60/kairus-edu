"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { detectarFormato, escanear, extrairTexto, type ResultadoScan } from "./ats";
import { conteudoSchema } from "./conteudo";
import { renderizarCurriculo } from "./pdf";

export type ArquivoResultado = { status: "idle" | "error" | "success"; message?: string; id?: string };

const SEM_PERMISSAO: ArquivoResultado = { status: "error", message: "Você não tem permissão para esta operação." };
const LIMITE_BYTES = 4 * 1024 * 1024;

async function estudanteDaSessao() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return null;
  const supabase = await createClient();
  const { data } = await supabase.from("estudantes").select("id, instituicao_id").eq("perfil_id", sessao.userId).maybeSingle();
  return data ? { supabase, estudanteId: data.id, instituicaoId: data.instituicao_id } : null;
}

/** Termos de uma análise de vaga do próprio estudante, para conferir no texto do currículo. */
async function termosDaAnalise(supabase: Awaited<ReturnType<typeof createClient>>, analiseId?: string) {
  if (!analiseId) return undefined;
  const { data } = await supabase.from("analises_vaga").select("titulo, resultado").eq("id", analiseId).maybeSingle();
  const requisitos = (data?.resultado as { requisitos?: { nome: string }[] } | null)?.requisitos ?? [];
  return data ? { titulo: data.titulo, termos: requisitos.map((r) => r.nome) } : undefined;
}

// ---------------------------------------------------------------------------
// Rascunho editado pelo estudante
// ---------------------------------------------------------------------------
export async function salvarRascunho(conteudo: unknown): Promise<ArquivoResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = conteudoSchema.safeParse(conteudo);
  if (!parsed.success) {
    const campo = parsed.error.issues[0];
    return { status: "error", message: `Revise o conteúdo${campo ? ` (${campo.path.join(" › ")})` : ""}: ${campo?.message ?? "inválido"}.` };
  }
  const { error } = await ctx.supabase
    .from("perfis_profissionais")
    .upsert({ estudante_id: ctx.estudanteId, instituicao_id: ctx.instituicaoId, rascunho: parsed.data }, { onConflict: "estudante_id" });
  if (error) return { status: "error", message: "Não foi possível salvar o rascunho." };
  revalidatePath("/curriculo", "layout");
  return { status: "success", message: "Rascunho salvo." };
}

// ---------------------------------------------------------------------------
// Gerar versão em PDF (servidor) e verificar a leitura do próprio arquivo
// ---------------------------------------------------------------------------
const versaoSchema = z.object({
  titulo: z.string().trim().min(2, "Dê um nome a esta versão.").max(120),
  modelo: z.enum(["classico", "compacto"]),
  analiseId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()),
});

export async function gerarVersao(_prev: ArquivoResultado, formData: FormData): Promise<ArquivoResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = versaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const { data: perfil } = await ctx.supabase.from("perfis_profissionais").select("rascunho").eq("estudante_id", ctx.estudanteId).maybeSingle();
  const conteudo = conteudoSchema.safeParse(perfil?.rascunho);
  if (!conteudo.success) return { status: "error", message: "Gere ou salve o rascunho antes de exportar." };

  const pdf = await renderizarCurriculo(conteudo.data, parsed.data.modelo);

  // O próprio PDF gerado passa pelo scanner: garante texto extraível e sem artefatos.
  const { texto, paginas } = await extrairTexto(pdf, "pdf");
  const scan = escanear(texto, paginas, await termosDaAnalise(ctx.supabase, parsed.data.analiseId));
  if (!scan.verificacoes.find((v) => v.id === "texto")?.ok) {
    console.error("[curriculo] PDF gerado sem texto extraível");
    return { status: "error", message: "O PDF gerado não passou na verificação de texto. Tente novamente." };
  }

  const caminho = `${ctx.instituicaoId}/${ctx.estudanteId}/versoes/${crypto.randomUUID()}.pdf`;
  const { error: erroUpload } = await ctx.supabase.storage
    .from("curriculos")
    .upload(caminho, pdf, { contentType: "application/pdf", upsert: false });
  if (erroUpload) {
    console.error("[curriculo] falha no upload da versão", erroUpload.name);
    return { status: "error", message: "Não foi possível guardar o PDF. Tente novamente." };
  }

  const { data: versao, error } = await ctx.supabase
    .from("curriculo_versoes")
    .insert({
      estudante_id: ctx.estudanteId,
      instituicao_id: ctx.instituicaoId,
      titulo: parsed.data.titulo,
      vaga_alvo: conteudo.data.vagaAlvo || null,
      modelo: parsed.data.modelo,
      conteudo: conteudo.data,
      storage_path: caminho,
      scan,
    })
    .select("id")
    .single();
  if (error) {
    await ctx.supabase.storage.from("curriculos").remove([caminho]);
    return { status: "error", message: "Não foi possível registrar a versão." };
  }

  revalidatePath("/curriculo", "layout");
  return { status: "success", id: versao.id, message: "PDF gerado." };
}

// ---------------------------------------------------------------------------
// Scanner de ATS: arquivo enviado pelo estudante (PDF ou DOCX)
// ---------------------------------------------------------------------------
export async function enviarCurriculo(_prev: ArquivoResultado, formData: FormData): Promise<ArquivoResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { status: "error", message: "Escolha um arquivo PDF ou DOCX." };
  if (arquivo.size > LIMITE_BYTES) return { status: "error", message: "O arquivo deve ter no máximo 4 MB." };

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const formato = detectarFormato(bytes);
  if (!formato) return { status: "error", message: "Formato não aceito. Envie um PDF ou DOCX." };

  let scan: ResultadoScan;
  try {
    const { texto, paginas } = await extrairTexto(bytes, formato);
    const analiseId = z.uuid().safeParse(formData.get("analiseId")).success ? String(formData.get("analiseId")) : undefined;
    scan = escanear(texto, paginas, await termosDaAnalise(ctx.supabase, analiseId));
  } catch {
    return { status: "error", message: "Não foi possível ler o arquivo. Ele pode estar protegido por senha ou corrompido." };
  }

  // O nome original não vai para o caminho do arquivo (pode conter dados pessoais).
  const caminho = `${ctx.instituicaoId}/${ctx.estudanteId}/enviados/${crypto.randomUUID()}.${formato}`;
  const tipo = formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const { error: erroUpload } = await ctx.supabase.storage.from("curriculos").upload(caminho, bytes, { contentType: tipo });
  if (erroUpload) return { status: "error", message: "Não foi possível guardar o arquivo. Tente novamente." };

  const nome = arquivo.name.replace(/[^\p{L}\p{N}\s._-]/gu, "").slice(0, 120) || `curriculo.${formato}`;
  const { data, error } = await ctx.supabase
    .from("curriculos_enviados")
    .insert({
      estudante_id: ctx.estudanteId,
      instituicao_id: ctx.instituicaoId,
      nome_exibicao: nome,
      storage_path: caminho,
      formato,
      tamanho_bytes: arquivo.size,
      scan,
    })
    .select("id")
    .single();
  if (error) {
    await ctx.supabase.storage.from("curriculos").remove([caminho]);
    return { status: "error", message: "Não foi possível registrar o arquivo." };
  }

  revalidatePath("/curriculo", "layout");
  return { status: "success", id: data.id };
}

/** Reanalisa uma versão gerada ou um arquivo enviado contra uma vaga analisada. */
export async function reanalisar(_prev: ArquivoResultado, formData: FormData): Promise<ArquivoResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx) return SEM_PERMISSAO;
  const parsed = z
    .object({ tipo: z.enum(["versao", "enviado"]), id: z.uuid(), analiseId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return SEM_PERMISSAO;

  const tabela = parsed.data.tipo === "versao" ? "curriculo_versoes" : "curriculos_enviados";
  const { data: registro } = await ctx.supabase.from(tabela).select("storage_path").eq("id", parsed.data.id).maybeSingle();
  if (!registro) return SEM_PERMISSAO;

  const { data: blob, error } = await ctx.supabase.storage.from("curriculos").download(registro.storage_path);
  if (error || !blob) return { status: "error", message: "Não foi possível abrir o arquivo." };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const formato = detectarFormato(bytes);
  if (!formato) return { status: "error", message: "Formato não reconhecido." };

  const { texto, paginas } = await extrairTexto(bytes, formato);
  const scan = escanear(texto, paginas, await termosDaAnalise(ctx.supabase, parsed.data.analiseId));
  await ctx.supabase.from(tabela).update({ scan }).eq("id", parsed.data.id);

  revalidatePath("/curriculo", "layout");
  return { status: "success", id: parsed.data.id };
}

export async function excluirArquivo(tipo: "versao" | "enviado", id: string): Promise<ArquivoResultado> {
  const ctx = await estudanteDaSessao();
  if (!ctx || !z.uuid().safeParse(id).success) return SEM_PERMISSAO;
  const tabela = tipo === "versao" ? "curriculo_versoes" : "curriculos_enviados";
  const { data: registro } = await ctx.supabase.from(tabela).select("storage_path").eq("id", id).maybeSingle();
  if (!registro) return SEM_PERMISSAO;

  await ctx.supabase.storage.from("curriculos").remove([registro.storage_path]);
  const { error } = await ctx.supabase.from(tabela).delete().eq("id", id);
  if (error) return { status: "error", message: "Não foi possível excluir." };
  revalidatePath("/curriculo", "layout");
  return { status: "success" };
}
