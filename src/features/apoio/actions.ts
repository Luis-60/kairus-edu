"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AcaoState } from "@/features/acoes/actions";
import { novaSolicitacaoSchema } from "./schemas";

const SEM_PERMISSAO: AcaoState = { status: "error", message: "Você não tem permissão para esta operação." };

/** Estudante pede contato da coordenação. Estudante e instituição vêm do banco, não do formulário. */
export async function enviarSolicitacao(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return SEM_PERMISSAO;

  const parsed = novaSolicitacaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const campo = String(issue.path[0] ?? "");
      if (campo && !fieldErrors[campo]) fieldErrors[campo] = issue.message;
    }
    return { status: "error", fieldErrors };
  }

  const supabase = await createClient();
  const { data: estudante } = await supabase
    .from("estudantes")
    .select("id, instituicao_id")
    .eq("perfil_id", sessao.userId)
    .maybeSingle();
  if (!estudante) return SEM_PERMISSAO;

  // Evita pedidos duplicados enquanto houver um em aberto.
  const { count } = await supabase
    .from("solicitacoes_apoio")
    .select("id", { count: "exact", head: true })
    .eq("estudante_id", estudante.id)
    .eq("status", "aberta");
  if ((count ?? 0) > 0) {
    return { status: "error", message: "Você já tem um pedido aberto. A coordenação vai responder em breve." };
  }

  const { error } = await supabase.from("solicitacoes_apoio").insert({
    instituicao_id: estudante.instituicao_id,
    estudante_id: estudante.id,
    assunto: parsed.data.assunto,
    mensagem: parsed.data.mensagem,
  });

  if (error) {
    console.error("[apoio] falha ao enviar", error.code);
    return { status: "error", message: "Não foi possível enviar seu pedido. Tente novamente." };
  }

  revalidatePath("/minha-jornada");
  return { status: "success", message: "Pedido enviado. A coordenação do seu curso vai entrar em contato." };
}

const statusSchema = z.object({
  solicitacaoId: z.uuid(),
  status: z.enum(["aberta", "em_atendimento", "encerrada"]),
});

export async function atualizarSolicitacao(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel === "estudante") return SEM_PERMISSAO;

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Status inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solicitacoes_apoio")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.solicitacaoId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[apoio] falha ao atualizar", error.code);
    return { status: "error", message: "Não foi possível atualizar o pedido." };
  }

  revalidatePath("/acoes");
  revalidatePath("/alunos");
  return { status: "success" };
}
