"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CandidaturaState = { status: "idle" | "error" | "success"; message?: string };

const entrada = z.object({ vagaId: z.uuid() });

export async function candidatar(_prev: CandidaturaState, formData: FormData): Promise<CandidaturaState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") {
    return { status: "error", message: "Você não tem permissão para esta operação." };
  }

  const parsed = entrada.safeParse({ vagaId: formData.get("vagaId") });
  if (!parsed.success) return { status: "error", message: "Vaga inválida." };

  const supabase = await createClient();
  const { data: estudante } = await supabase
    .from("estudantes")
    .select("id, instituicao_id")
    .eq("perfil_id", sessao.userId)
    .maybeSingle();
  if (!estudante) return { status: "error", message: "Sua matrícula não está vinculada a esta conta." };

  const { error } = await supabase.from("candidaturas").insert({
    instituicao_id: estudante.instituicao_id,
    estudante_id: estudante.id,
    vaga_id: parsed.data.vagaId,
  });

  if (error) {
    if (error.code === "23505") return { status: "error", message: "Você já se candidatou a esta vaga." };
    if (error.code === "23514") return { status: "error", message: "Esta vaga ainda não está disponível para o seu período." };
    console.error("[carreira] falha na candidatura", error.code);
    return { status: "error", message: "Não foi possível enviar a candidatura. Tente novamente." };
  }

  revalidatePath("/carreira");
  return { status: "success", message: "Candidatura enviada." };
}
