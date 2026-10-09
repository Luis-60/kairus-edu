"use server";

import { revalidatePath } from "next/cache";
import { gerarEstruturado, MENSAGEM_ERRO_IA } from "@/lib/ai/cliente";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { carregarVisaoGeral } from "@/features/gestao/queries";
import { MOTIVO } from "@/lib/labels";
import { insightsSchema, SISTEMA_INSIGHTS } from "./prompts";

export type IaState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const SEM_PERMISSAO: IaState = { status: "error", message: "Você não tem permissão para esta operação." };

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
