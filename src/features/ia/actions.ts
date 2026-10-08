"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { gerarEstruturado, MENSAGEM_ERRO_IA } from "@/lib/ai/cliente";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { carregarVisaoGeral } from "@/features/gestao/queries";
import { MOTIVO } from "@/lib/labels";
import {
  curriculoSchema,
  insightsSchema,
  SISTEMA_CURRICULO,
  SISTEMA_INSIGHTS,
  SISTEMA_VIVENCIAS,
  vivenciasSchema,
} from "./prompts";

export type IaState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const SEM_PERMISSAO: IaState = { status: "error", message: "Você não tem permissão para esta operação." };

/** Estudante vinculado à conta atual (RLS garante que só o próprio registro é lido). */
async function estudanteAtual(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("estudantes")
    .select("id, instituicao_id, periodo_atual, cursos(nome)")
    .eq("perfil_id", userId)
    .maybeSingle();
  return data;
}

const vivenciasInput = z.object({
  vivencias: z
    .string()
    .trim()
    .min(40, "Conte um pouco mais, com pelo menos 40 caracteres.")
    .max(3000, "Use no máximo 3000 caracteres."),
});

export async function transformarVivencias(_prev: IaState, formData: FormData): Promise<IaState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return SEM_PERMISSAO;

  const parsed = vivenciasInput.safeParse({ vivencias: formData.get("vivencias") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: { vivencias: parsed.error.issues[0]?.message } };
  }

  const estudante = await estudanteAtual(sessao.userId);
  if (!estudante) return SEM_PERMISSAO;

  const resultado = await gerarEstruturado({
    funcao: "vivencias",
    sessao,
    sistema: SISTEMA_VIVENCIAS,
    conteudo: `Curso do estudante: ${estudante.cursos?.nome ?? "não informado"}\n\n<vivencias>\n${parsed.data.vivencias}\n</vivencias>`,
    schema: vivenciasSchema,
  });
  if (!resultado.ok) return { status: "error", message: MENSAGEM_ERRO_IA[resultado.erro] };

  if (!resultado.data.suficiente || resultado.data.competencias.length === 0) {
    return {
      status: "error",
      message: "Não encontramos experiências no texto. Conte o que você fez, onde e por quanto tempo.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("curriculos").upsert(
    {
      instituicao_id: estudante.instituicao_id,
      estudante_id: estudante.id,
      vivencias: parsed.data.vivencias,
      competencias_vivencias: resultado.data.competencias,
      experiencia_texto: resultado.data.texto_curriculo,
      vivencias_geradas_em: new Date().toISOString(),
    },
    { onConflict: "estudante_id" },
  );
  if (error) {
    console.error("[ia] falha ao salvar vivências", error.code);
    return { status: "error", message: "As competências foram geradas, mas não foi possível salvá-las. Tente novamente." };
  }

  revalidatePath("/carreira");
  revalidatePath("/minha-jornada");
  return { status: "success" };
}

export async function gerarCurriculo(): Promise<IaState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return SEM_PERMISSAO;

  const estudante = await estudanteAtual(sessao.userId);
  if (!estudante) return SEM_PERMISSAO;

  const supabase = await createClient();
  const [{ data: competencias }, { data: curriculo }] = await Promise.all([
    supabase
      .from("estudante_competencias")
      .select("nivel, competencias(nome)")
      .eq("estudante_id", estudante.id)
      .order("progresso", { ascending: false }),
    supabase
      .from("curriculos")
      .select("competencias_vivencias, experiencia_texto")
      .eq("estudante_id", estudante.id)
      .maybeSingle(),
  ]);

  const reconhecidas = (competencias ?? []).flatMap((c) =>
    c.competencias ? [`${c.competencias.nome} (${c.nivel === "tem" ? "consolidada" : "em desenvolvimento"})`] : [],
  );
  const dasVivencias = Array.isArray(curriculo?.competencias_vivencias)
    ? (curriculo.competencias_vivencias as { competencia?: unknown }[]).flatMap((c) =>
        typeof c.competencia === "string" ? [c.competencia] : [],
      )
    : [];

  if (reconhecidas.length === 0 && dasVivencias.length === 0) {
    return {
      status: "error",
      message: "Ainda não há competências para montar o currículo. Use primeiro “Monte seu currículo com IA” em Carreira e estágio.",
    };
  }

  const dados = [
    `Curso: ${estudante.cursos?.nome ?? "não informado"}`,
    `Período atual: ${estudante.periodo_atual}º`,
    `Competências reconhecidas pela instituição: ${reconhecidas.join("; ") || "nenhuma"}`,
    `Competências descritas pelo estudante: ${dasVivencias.join("; ") || "nenhuma"}`,
    `Experiência descrita pelo estudante: ${curriculo?.experiencia_texto ?? "nenhuma"}`,
  ].join("\n");

  const resultado = await gerarEstruturado({
    funcao: "curriculo",
    sessao,
    sistema: SISTEMA_CURRICULO,
    conteudo: `<dados>\n${dados}\n</dados>`,
    schema: curriculoSchema,
  });
  if (!resultado.ok) return { status: "error", message: MENSAGEM_ERRO_IA[resultado.erro] };

  const { error } = await supabase.from("curriculos").upsert(
    {
      instituicao_id: estudante.instituicao_id,
      estudante_id: estudante.id,
      resumo: resultado.data.resumo,
      competencias_texto: resultado.data.competencias_texto,
      curriculo_gerado_em: new Date().toISOString(),
    },
    { onConflict: "estudante_id" },
  );
  if (error) {
    console.error("[ia] falha ao salvar currículo", error.code);
    return { status: "error", message: "O currículo foi gerado, mas não foi possível salvá-lo. Tente novamente." };
  }

  revalidatePath("/minha-jornada");
  return { status: "success" };
}

/** Insights para a gestão, gerados apenas a partir de indicadores agregados. */
export async function gerarInsights(): Promise<IaState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "gestor") return SEM_PERMISSAO;

  const supabase = await createClient();
  const [d, fatores] = await Promise.all([carregarVisaoGeral(), supabase.rpc("painel_fatores")]);
  if (!d.kpis.ok || !d.semestres.ok || !d.cursos.ok || !d.periodos.ok || !d.modalidades.ok || !d.faixas.ok) {
    return { status: "error", message: "Não foi possível reunir os indicadores. Tente novamente." };
  }

  const semestres = d.semestres.data;
  const janela =
    semestres.length > 0 ? `${semestres[0].codigo} a ${semestres[semestres.length - 1].codigo}` : "semestres encerrados";

  // Cada recorte declara o período a que se refere, para a IA não misturar semestre e acumulado.
  const dados = {
    ultimo_semestre_encerrado: {
      semestre: d.kpis.data.periodo_encerrado,
      taxa_evasao_pct: d.kpis.data.taxa_evasao,
      taxa_evasao_semestre_anterior_pct: d.kpis.data.taxa_evasao_anterior,
    },
    evasao_por_semestre: semestres.map((s) => ({ semestre: s.codigo, evasao_pct: s.taxa })),
    acumulado_dos_semestres_encerrados: {
      periodo_de_referencia: janela,
      evasao_media_pct:
        semestres.reduce((a, s) => a + s.total, 0) > 0
          ? Math.round((1000 * semestres.reduce((a, s) => a + s.evadidos, 0)) / semestres.reduce((a, s) => a + s.total, 0)) / 10
          : null,
      por_curso: d.cursos.data.map((c) => ({ curso: c.rotulo, evasao_pct: c.taxa })),
      por_periodo_do_curso: d.periodos.data.map((p) => ({ periodo: p.rotulo, evasao_pct: p.taxa })),
      por_modalidade: d.modalidades.data.map((m) => ({
        modalidade: m.rotulo === "ead" ? "a distância" : "presencial",
        evasao_pct: m.taxa,
      })),
    },
    turma_em_andamento: {
      semestre: d.kpis.data.periodo_corrente,
      alunos_por_faixa_de_risco: d.faixas.data,
      fatores_mais_associados_ao_risco: (fatores.data ?? []).slice(0, 7).map((f) => ({
        fator: f.fator,
        alunos_em_risco_com_o_fator: f.alunos,
      })),
    },
    pesquisa_de_desligamento: {
      periodo_de_referencia: "todas as respostas com consentimento",
      motivos_pct: d.motivos.ok ? d.motivos.data.map((m) => ({ motivo: MOTIVO[m.motivo], pct: m.percentual })) : [],
    },
  };


  const resultado = await gerarEstruturado({
    funcao: "insights",
    sessao,
    sistema: SISTEMA_INSIGHTS,
    conteudo: `<dados>\n${JSON.stringify(dados)}\n</dados>`,
    schema: insightsSchema,
    esforco: "medium",
  });
  if (!resultado.ok) return { status: "error", message: MENSAGEM_ERRO_IA[resultado.erro] };

  const { error: erroApagar } = await supabase
    .from("insights")
    .delete()
    .eq("contexto", "inteligencia")
    .eq("origem", "ia");
  const geradoEm = new Date().toISOString();
  const { error } = erroApagar
    ? { error: erroApagar }
    : await supabase.from("insights").insert(
        resultado.data.insights.map((i, ordem) => ({
          instituicao_id: sessao.instituicaoId,
          contexto: "inteligencia",
          categoria: i.categoria,
          texto: i.texto,
          acao_sugerida: i.acao_sugerida,
          ordem,
          origem: "ia",
          gerado_em: geradoEm,
        })),
      );
  if (error) {
    console.error("[ia] falha ao salvar insights", error.code);
    return { status: "error", message: "Os insights foram gerados, mas não foi possível salvá-los." };
  }

  revalidatePath("/inteligencia");
  return { status: "success" };
}
