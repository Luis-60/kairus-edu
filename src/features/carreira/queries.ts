import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SituacaoCompetencia = "tem" | "desenvolvendo" | "falta";

export type Vaga = {
  id: string;
  titulo: string;
  descricao: string;
  cidade: string;
  empresa: string;
  periodoMinimo: number;
  cargaHoraria: string;
  compatibilidade: number;
  competencias: { nome: string; situacao: SituacaoCompetencia }[];
  candidatada: boolean;
  dica: string;
};

/** Compatibilidade: competência já consolidada vale 1, em desenvolvimento vale 0,5. */
function compatibilidade(competencias: { situacao: SituacaoCompetencia }[]) {
  if (competencias.length === 0) return 0;
  const pontos = competencias.reduce((s, c) => s + (c.situacao === "tem" ? 1 : c.situacao === "desenvolvendo" ? 0.5 : 0), 0);
  return Math.round((pontos / competencias.length) * 100);
}

export async function carregarCarreira(userId: string) {
  const supabase = await createClient();

  const { data: estudante, error } = await supabase
    .from("estudantes")
    .select("id, periodo_atual, curso_id, cursos(nome)")
    .eq("perfil_id", userId)
    .maybeSingle();
  if (error) return { ok: false as const };
  if (!estudante) return { ok: true as const, data: null };

  const [etapas, vagas, minhas, candidaturas, areas, empresas] = await Promise.all([
    supabase
      .from("trilha_carreira_etapas")
      .select("id, periodo, titulo, descricao, entrega")
      .eq("curso_id", estudante.curso_id)
      .order("periodo"),
    supabase
      .from("vagas")
      .select("id, titulo, descricao, cidade, periodo_minimo, carga_horaria, empresas(nome), vaga_competencias(competencias(id, nome))")
      .eq("curso_id", estudante.curso_id)
      .eq("ativa", true),
    supabase.from("estudante_competencias").select("competencia_id, nivel").eq("estudante_id", estudante.id),
    supabase.from("candidaturas").select("vaga_id").eq("estudante_id", estudante.id),
    supabase
      .from("areas_atuacao")
      .select("id, nome, descricao, ordem, area_passos(ordem, titulo, descricao)")
      .eq("curso_id", estudante.curso_id)
      .order("ordem"),
    supabase
      .from("empresas")
      .select("id, nome, setor, areas, cidade, distancia_campus_km")
      .order("distancia_campus_km", { ascending: true, nullsFirst: false })
      .limit(12),
  ]);

  if (etapas.error || vagas.error || minhas.error || areas.error || empresas.error) {
    console.error("[carreira] falha na consulta");
    return { ok: false as const };
  }

  const nivelPorCompetencia = new Map((minhas.data ?? []).map((c) => [c.competencia_id, c.nivel]));
  const candidatadas = new Set((candidaturas.data ?? []).map((c) => c.vaga_id));

  const listaVagas: Vaga[] = (vagas.data ?? [])
    .map((v) => {
      const competencias = v.vaga_competencias.flatMap((vc) => {
        if (!vc.competencias) return [];
        const nivel = nivelPorCompetencia.get(vc.competencias.id);
        const situacao: SituacaoCompetencia = nivel === "tem" ? "tem" : nivel === "desenvolvendo" ? "desenvolvendo" : "falta";
        return [{ nome: vc.competencias.nome, situacao }];
      });
      const ordem: Record<SituacaoCompetencia, number> = { tem: 0, desenvolvendo: 1, falta: 2 };
      competencias.sort((a, b) => ordem[a.situacao] - ordem[b.situacao]);

      const faltam = competencias.filter((c) => c.situacao === "falta").map((c) => c.nome);
      const dica =
        estudante.periodo_atual < v.periodo_minimo
          ? `A vaga pede o ${v.periodo_minimo}º período. Salve e acompanhe.`
          : faltam.length > 0
            ? `Desenvolver ${faltam.join(", ")} aumenta a sua compatibilidade.`
            : "Você já reúne todas as competências pedidas.";

      return {
        id: v.id,
        titulo: v.titulo,
        descricao: v.descricao,
        cidade: v.cidade,
        empresa: v.empresas?.nome ?? "",
        periodoMinimo: v.periodo_minimo,
        cargaHoraria: v.carga_horaria,
        compatibilidade: compatibilidade(competencias),
        competencias,
        candidatada: candidatadas.has(v.id),
        dica,
      };
    })
    .sort((a, b) => b.compatibilidade - a.compatibilidade);

  return {
    ok: true as const,
    data: {
      periodoAtual: estudante.periodo_atual,
      curso: estudante.cursos?.nome ?? "",
      etapas: etapas.data ?? [],
      vagas: listaVagas,
      areas: (areas.data ?? []).map((a) => ({
        ...a,
        area_passos: [...a.area_passos].sort((x, y) => x.ordem - y.ordem),
      })),
      empresas: empresas.data ?? [],
    },
  };
}

export type DadosCarreira = NonNullable<Extract<Awaited<ReturnType<typeof carregarCarreira>>, { ok: true }>["data"]>;
