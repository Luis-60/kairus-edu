"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { novaAcaoSchema, statusAcaoSchema } from "./schemas";

export type AcaoState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const SEM_PERMISSAO: AcaoState = { status: "error", message: "Você não tem permissão para esta operação." };

export async function registrarAcao(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel === "estudante") return SEM_PERMISSAO;

  const parsed = novaAcaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const campo = String(issue.path[0] ?? "");
      if (campo && !fieldErrors[campo]) fieldErrors[campo] = issue.message;
    }
    return { status: "error", fieldErrors };
  }

  const supabase = await createClient();
  // A leitura passa pela RLS: se o estudante não estiver no escopo do usuário, não há linha.
  const { data: estudante } = await supabase
    .from("estudantes")
    .select("id, instituicao_id")
    .eq("id", parsed.data.estudanteId)
    .maybeSingle();
  if (!estudante) return SEM_PERMISSAO;

  const { error } = await supabase.from("acoes_permanencia").insert({
    instituicao_id: estudante.instituicao_id,
    estudante_id: estudante.id,
    tipo: parsed.data.tipo,
    descricao: parsed.data.descricao,
    responsavel_id: parsed.data.responsavelId,
    prazo: parsed.data.prazo,
    criada_por: sessao.userId,
  });

  if (error) {
    console.error("[acoes] falha ao registrar", error.code);
    return {
      status: "error",
      message:
        error.code === "23514"
          ? "O responsável escolhido não pode receber esta ação."
          : "Não foi possível registrar a ação. Tente novamente.",
    };
  }

  revalidatePath("/alunos");
  revalidatePath("/acoes");
  return { status: "success", message: "Ação registrada." };
}

export async function atualizarStatusAcao(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel === "estudante") return SEM_PERMISSAO;

  const parsed = statusAcaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Status inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("acoes_permanencia")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.acaoId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[acoes] falha ao atualizar", error.code);
    return { status: "error", message: "Não foi possível atualizar a ação." };
  }

  revalidatePath("/alunos");
  revalidatePath("/acoes");
  return { status: "success", message: "Status atualizado." };
}
