import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/auth/roles";
import { homeFor } from "@/lib/auth/roles";

export type Sessao = {
  userId: string;
  nome: string;
  papel: Papel;
  instituicaoId: string;
  instituicaoNome: string;
};

/** Sessão do usuário atual com o perfil validado no banco. Memorizada por requisição. */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel, ativo, instituicao_id, instituicoes(nome)")
    .eq("id", userId)
    .maybeSingle();

  if (!perfil || !perfil.ativo) return null;

  return {
    userId,
    nome: perfil.nome,
    papel: perfil.papel,
    instituicaoId: perfil.instituicao_id,
    instituicaoNome: perfil.instituicoes?.nome ?? "",
  };
});

/** Exige sessão válida com perfil ativo. */
export async function requireSessao(): Promise<Sessao> {
  const sessao = await getSessao();
  // Sem perfil ativo: encerra a sessão antes de voltar ao login (evita laço com o proxy).
  if (!sessao) redirect("/auth/sair?erro=sessao");
  return sessao;
}

/** Exige um dos papéis informados; caso contrário, leva ao estado de acesso negado. */
export async function requirePapel(...papeis: Papel[]): Promise<Sessao> {
  const sessao = await requireSessao();
  if (!papeis.includes(sessao.papel)) redirect("/sem-permissao");
  return sessao;
}

export { homeFor };
