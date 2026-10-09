import "server-only";
import { createClient } from "@/lib/supabase/server";
import { conteudoSchema, type Conteudo } from "./conteudo";

/** Tudo o que o construtor de currículo precisa do próprio estudante (RLS limita ao dono). */
export async function carregarPerfilCompleto(userId: string) {
  const supabase = await createClient();
  const { data: estudante, error } = await supabase
    .from("estudantes")
    .select("id, instituicao_id, codigo, periodo_atual, curso_id, cursos(nome, total_periodos), instituicoes(nome)")
    .eq("perfil_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[curriculo] falha ao carregar estudante", error.code);
    return { ok: false as const };
  }
  if (!estudante) return { ok: true as const, data: null };

  const [perfil, experiencias, projetos, certificacoes, idiomas, habilidades, reconhecidas, versoes, analises, enviados, corrente] =
    await Promise.all([
      supabase.from("perfis_profissionais").select("*").eq("estudante_id", estudante.id).maybeSingle(),
      supabase.from("experiencias").select("*").eq("estudante_id", estudante.id).order("ordem").order("inicio", { ascending: false }),
      supabase.from("projetos").select("*").eq("estudante_id", estudante.id).order("ordem").order("created_at"),
      supabase.from("certificacoes").select("*").eq("estudante_id", estudante.id).order("concluido_em", { ascending: false }),
      supabase.from("idiomas").select("*").eq("estudante_id", estudante.id).order("created_at"),
      supabase.from("habilidades").select("*").eq("estudante_id", estudante.id).order("created_at"),
      supabase
        .from("estudante_competencias")
        .select("nivel, origem, competencias(nome)")
        .eq("estudante_id", estudante.id)
        .eq("nivel", "tem"),
      supabase
        .from("curriculo_versoes")
        .select("id, titulo, vaga_alvo, modelo, scan, created_at")
        .eq("estudante_id", estudante.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("analises_vaga")
        .select("id, origem, titulo, resultado, created_at")
        .eq("estudante_id", estudante.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("curriculos_enviados")
        .select("id, nome_exibicao, formato, tamanho_bytes, scan, created_at")
        .eq("estudante_id", estudante.id)
        .order("created_at", { ascending: false }),
      supabase.from("periodos_letivos").select("codigo").eq("encerrado", false).order("inicio", { ascending: false }).limit(1).maybeSingle(),
    ]);

  const total = estudante.cursos?.total_periodos ?? estudante.periodo_atual;
  const rascunho = perfil.data?.rascunho ? conteudoSchema.safeParse(perfil.data.rascunho) : null;

  return {
    ok: true as const,
    data: {
      estudante: {
        id: estudante.id,
        instituicaoId: estudante.instituicao_id,
        curso: estudante.cursos?.nome ?? "",
        cursoId: estudante.curso_id,
        instituicao: estudante.instituicoes?.nome ?? "",
        periodoAtual: estudante.periodo_atual,
        totalPeriodos: total,
        previsaoConclusao: corrente.data?.codigo ? somarSemestres(corrente.data.codigo, total - estudante.periodo_atual) : null,
      },
      perfil: perfil.data,
      experiencias: experiencias.data ?? [],
      projetos: projetos.data ?? [],
      certificacoes: certificacoes.data ?? [],
      idiomas: idiomas.data ?? [],
      habilidades: habilidades.data ?? [],
      reconhecidasPelaInstituicao: (reconhecidas.data ?? []).flatMap((r) => (r.competencias ? [r.competencias.nome] : [])),
      rascunho: rascunho?.success ? (rascunho.data as Conteudo) : null,
      versoes: versoes.data ?? [],
      analises: analises.data ?? [],
      enviados: enviados.data ?? [],
    },
  };
}

export type PerfilCompleto = NonNullable<Extract<Awaited<ReturnType<typeof carregarPerfilCompleto>>, { ok: true }>["data"]>;

function somarSemestres(codigo: string, semestres: number) {
  const [ano, sem] = codigo.split(".").map(Number);
  const indice = ano * 2 + (sem - 1) + semestres;
  return `${Math.floor(indice / 2)}.${(indice % 2) + 1}`;
}
