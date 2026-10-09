"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PrivacidadeResultado = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const SEM_PERMISSAO: PrivacidadeResultado = { status: "error", message: "Você não tem permissão para esta operação." };

const pedidoSchema = z.object({
  tipo: z.enum(["acesso", "correcao", "exclusao", "outro"], { error: "Escolha o tipo de pedido." }),
  mensagem: z.string().trim().min(10, "Descreva o pedido com pelo menos 10 caracteres.").max(1000),
});

/** Pedido do titular (acesso, correção, exclusão), respondido pela gestão da instituição. */
export async function abrirPedidoTitular(_prev: PrivacidadeResultado, formData: FormData): Promise<PrivacidadeResultado> {
  const sessao = await getSessao();
  if (!sessao) return SEM_PERMISSAO;
  const parsed = pedidoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { status: "error", fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos_titular").insert({
    instituicao_id: sessao.instituicaoId,
    perfil_id: sessao.userId,
    tipo: parsed.data.tipo,
    mensagem: parsed.data.mensagem,
  });
  if (error) {
    console.error("[privacidade] falha ao abrir pedido", error.code);
    return { status: "error", message: "Não foi possível enviar o pedido. Tente novamente." };
  }
  revalidatePath("/meus-dados");
  return { status: "success", message: "Pedido enviado. A instituição vai responder por aqui." };
}

const respostaSchema = z.object({
  id: z.uuid(),
  status: z.enum(["aberto", "em_andamento", "concluido"]),
  resposta: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(2000).optional()),
});

export async function responderPedidoTitular(_prev: PrivacidadeResultado, formData: FormData): Promise<PrivacidadeResultado> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "gestor") return SEM_PERMISSAO;
  const parsed = respostaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Dados inválidos." };
  if (parsed.data.status === "concluido" && !parsed.data.resposta) {
    return { status: "error", message: "Escreva a resposta ao aluno antes de concluir." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos_titular")
    .update({ status: parsed.data.status, resposta: parsed.data.resposta ?? null })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { status: "error", message: "Não foi possível salvar." };
  revalidatePath("/privacidade");
  return { status: "success", message: "Resposta salva." };
}

/**
 * Exclui os dados de carreira do próprio estudante (perfil profissional, currículos, arquivos e
 * análises). Dados acadêmicos e de permanência são mantidos pela instituição; para eles, existe o
 * pedido de titular.
 */
export async function excluirDadosCarreira(confirmacao: string): Promise<PrivacidadeResultado> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return SEM_PERMISSAO;
  if (confirmacao.trim().toUpperCase() !== "EXCLUIR") {
    return { status: "error", message: "Digite EXCLUIR para confirmar." };
  }

  const supabase = await createClient();
  const { data: estudante } = await supabase.from("estudantes").select("id").eq("perfil_id", sessao.userId).maybeSingle();
  if (!estudante) return SEM_PERMISSAO;

  const [versoes, enviados] = await Promise.all([
    supabase.from("curriculo_versoes").select("storage_path").eq("estudante_id", estudante.id),
    supabase.from("curriculos_enviados").select("storage_path").eq("estudante_id", estudante.id),
  ]);
  const caminhos = [...(versoes.data ?? []), ...(enviados.data ?? [])].map((r) => r.storage_path);
  if (caminhos.length) {
    const { error } = await supabase.storage.from("curriculos").remove(caminhos);
    if (error) return { status: "error", message: "Não foi possível excluir os arquivos. Nada foi apagado; tente novamente." };
  }

  const tabelas = [
    "curriculo_versoes",
    "curriculos_enviados",
    "analises_vaga",
    "habilidades",
    "certificacoes",
    "idiomas",
    "projetos",
    "experiencias",
    "perfis_profissionais",
  ] as const;
  for (const tabela of tabelas) {
    const { error } = await supabase.from(tabela).delete().eq("estudante_id", estudante.id);
    if (error) {
      console.error("[privacidade] falha ao excluir", tabela, error.code);
      return { status: "error", message: "A exclusão ficou incompleta. Tente novamente para concluir." };
    }
  }
  await supabase.rpc("registrar_exclusao_carreira");

  revalidatePath("/", "layout");
  return { status: "success", message: "Seus dados de carreira foram excluídos." };
}
