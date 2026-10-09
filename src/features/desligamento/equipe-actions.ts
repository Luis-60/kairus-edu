"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AcaoState } from "@/features/acoes/actions";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const SEM_PERMISSAO: AcaoState = { status: "error", message: "Você não tem permissão para esta operação." };

const registrarSchema = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,12}$/, "Informe o código de matrícula do aluno."),
  tipo: z.enum(["trancamento", "cancelamento"], { error: "Escolha o tipo de pedido." }),
});

/** Registro manual de pedido (quando não há integração com o sistema acadêmico). */
export async function registrarPedido(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel === "estudante") return SEM_PERMISSAO;

  const parsed = registrarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const campo = String(issue.path[0] ?? "");
      if (campo && !fieldErrors[campo]) fieldErrors[campo] = issue.message;
    }
    return { status: "error", fieldErrors };
  }

  const supabase = await createClient();
  // A RLS só devolve alunos do escopo do usuário (o coordenador vê apenas os seus cursos).
  const { data: estudante } = await supabase
    .from("estudantes")
    .select("id, instituicao_id, situacao")
    .eq("codigo", parsed.data.codigo)
    .maybeSingle();
  if (!estudante) {
    return { status: "error", fieldErrors: { codigo: "Aluno não encontrado no seu escopo de acesso." } };
  }
  if (estudante.situacao !== "ativo") {
    return { status: "error", fieldErrors: { codigo: "A matrícula deste aluno não está ativa." } };
  }

  const { count } = await supabase
    .from("pedidos_desligamento")
    .select("id", { count: "exact", head: true })
    .eq("estudante_id", estudante.id)
    .eq("status", "aberto");
  if ((count ?? 0) > 0) {
    return { status: "error", fieldErrors: { codigo: "Este aluno já tem um pedido aberto." } };
  }

  const { error } = await supabase.from("pedidos_desligamento").insert({
    instituicao_id: estudante.instituicao_id,
    estudante_id: estudante.id,
    tipo: parsed.data.tipo,
    origem: "manual",
    registrado_por: sessao.userId,
  });
  if (error) {
    console.error("[desligamento] falha ao registrar pedido", error.code);
    return { status: "error", message: "Não foi possível registrar o pedido. Tente novamente." };
  }

  revalidatePath("/desligamentos");
  return { status: "success", message: "Pedido registrado. O questionário já está disponível para o aluno." };
}

const statusSchema = z.object({
  pedidoId: z.uuid(),
  status: z.enum(["aberto", "concluido", "revertido"]),
});

export async function atualizarStatusPedido(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel === "estudante") return SEM_PERMISSAO;

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Status inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos_desligamento")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.pedidoId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[desligamento] falha ao atualizar pedido", error.code);
    return { status: "error", message: "Não foi possível atualizar o pedido." };
  }

  revalidatePath("/desligamentos");
  return { status: "success" };
}
