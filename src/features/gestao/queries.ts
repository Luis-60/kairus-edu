import "server-only";
import { resultado } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

/** Consultas da visão geral. As funções no banco já exigem o papel de gestor. */
export async function carregarVisaoGeral() {
  const supabase = await createClient();

  const [kpis, semestres, faixas, cursos, periodos, modalidades, motivos, insights] = await Promise.all([
    supabase.rpc("painel_kpis").maybeSingle(),
    supabase.rpc("painel_evasao_semestres"),
    supabase.rpc("painel_risco_faixas"),
    supabase.rpc("painel_evasao_por", { p_recorte: "curso" }),
    supabase.rpc("painel_evasao_por", { p_recorte: "periodo" }),
    supabase.rpc("painel_evasao_por", { p_recorte: "modalidade" }),
    supabase.rpc("painel_motivos"),
    supabase.from("insights").select("categoria, texto").eq("contexto", "visao_geral").order("ordem").limit(1),
  ]);

  return {
    kpis: resultado("gestao", kpis.data, kpis.error),
    semestres: resultado("gestao", semestres.data, semestres.error),
    faixas: resultado("gestao", faixas.data, faixas.error),
    cursos: resultado("gestao", cursos.data, cursos.error),
    periodos: resultado("gestao", periodos.data, periodos.error),
    modalidades: resultado("gestao", modalidades.data, modalidades.error),
    motivos: resultado("gestao", motivos.data, motivos.error),
    insight: resultado("gestao", insights.data, insights.error),
  };
}
