import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/result";

export async function carregarInteligencia() {
  const supabase = await createClient();

  const [faixas, fatores, metricas, cursos, periodos, modalidades, semestres, insights] = await Promise.all([
    supabase.rpc("painel_risco_faixas"),
    supabase.rpc("painel_fatores"),
    supabase
      .from("metricas_modelo")
      .select("modelo_versao, momento, auc, captura_top20, periodo_treino, periodo_teste, base_simulada")
      .order("created_at", { ascending: false })
      .limit(2),
    supabase.rpc("painel_evasao_por", { p_recorte: "curso" }),
    supabase.rpc("painel_evasao_por", { p_recorte: "periodo" }),
    supabase.rpc("painel_evasao_por", { p_recorte: "modalidade" }),
    supabase.rpc("painel_evasao_semestres"),
    supabase
      .from("insights")
      .select("id, categoria, texto, acao_sugerida, origem, gerado_em")
      .eq("contexto", "inteligencia")
      .order("ordem"),
  ]);

  // Segmentos: os recortes com maior evasão, comparados à média dos semestres encerrados.
  const segmentos =
    cursos.data && periodos.data && modalidades.data
      ? [
          ...modalidades.data.map((m) => ({
            nome: m.rotulo === "ead" ? "Cursos a distância" : "Cursos presenciais",
            recorte: "Modalidade",
            taxa: Number(m.taxa ?? 0),
          })),
          ...cursos.data.map((c) => ({ nome: c.rotulo, recorte: "Curso", taxa: Number(c.taxa ?? 0) })),
          ...periodos.data.map((p) => ({ nome: `Alunos do ${p.rotulo} período`, recorte: "Jornada", taxa: Number(p.taxa ?? 0) })),
        ]
          .sort((a, b) => b.taxa - a.taxa)
          .slice(0, 5)
      : null;

  const totais = semestres.data?.reduce(
    (acc, s) => ({ total: acc.total + s.total, evadidos: acc.evadidos + s.evadidos }),
    { total: 0, evadidos: 0 },
  );
  const media = totais && totais.total > 0 ? (100 * totais.evadidos) / totais.total : null;

  // Insights gerados por IA têm prioridade sobre os curados.
  const lista = insights.data ?? [];
  const daIa = lista.filter((i) => i.origem === "ia");

  return {
    faixas: resultado("inteligencia", faixas.data, faixas.error),
    fatores: resultado("inteligencia", fatores.data, fatores.error),
    metricas: resultado("inteligencia", metricas.data, metricas.error),
    segmentos: resultado("inteligencia", segmentos, cursos.error ?? periodos.error ?? modalidades.error),
    media,
    insights: resultado("inteligencia", daIa.length > 0 ? daIa : lista, insights.error),
  };
}
