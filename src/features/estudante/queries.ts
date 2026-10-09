import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/result";

/**
 * Dados da jornada do próprio estudante. A RLS limita a leitura ao registro vinculado à conta;
 * o score de risco não é acessível ao estudante.
 */
export async function carregarJornada(userId: string) {
  const supabase = await createClient();

  const { data: estudante, error } = await supabase
    .from("estudantes")
    .select("id, codigo, periodo_atual, cursos(nome, total_periodos), instituicoes(frequencia_minima)")
    .eq("perfil_id", userId)
    .maybeSingle();

  if (error) return resultado("jornada", null, error);
  if (!estudante) return { ok: true as const, data: null };

  const [indicadores, solicitacao, competencias, curriculo] = await Promise.all([
    supabase
      .from("indicadores_academicos")
      .select("frequencia, coeficiente, disciplinas, entregas_atrasadas, creditos_concluidos_pct, periodos_letivos!inner(codigo, encerrado)")
      .eq("estudante_id", estudante.id)
      .eq("periodos_letivos.encerrado", false)
      .maybeSingle(),
    supabase
      .from("solicitacoes_apoio")
      .select("id, assunto, status, created_at")
      .eq("estudante_id", estudante.id)
      .neq("status", "encerrada")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("estudante_competencias")
      .select("nivel, progresso, origem, competencias(nome)")
      .eq("estudante_id", estudante.id)
      .order("progresso", { ascending: false }),
    supabase
      .from("curriculo_versoes")
      .select("id, titulo, created_at")
      .eq("estudante_id", estudante.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    ok: true as const,
    data: {
      codigo: estudante.codigo,
      periodoAtual: estudante.periodo_atual,
      curso: estudante.cursos?.nome ?? "",
      totalPeriodos: estudante.cursos?.total_periodos ?? estudante.periodo_atual,
      frequenciaMinima: Number(estudante.instituicoes?.frequencia_minima ?? 75),
      indicadores: indicadores.data,
      solicitacaoAberta: solicitacao.data,
      competencias: (competencias.data ?? []).flatMap((c) =>
        c.competencias ? [{ nome: c.competencias.nome, nivel: c.nivel, progresso: c.progresso, origem: c.origem }] : [],
      ),
      ultimaVersao: curriculo.data,
    },
  };
}
