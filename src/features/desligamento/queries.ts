import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/result";
import type { Motivo } from "./questionario";

/** Questionário do próprio estudante, com respostas e os serviços de apoio da instituição. */
export async function carregarQuestionario(id: string) {
  const supabase = await createClient();
  const { data: q, error } = await supabase
    .from("questionarios_desligamento")
    .select("id, status, etapa_atual, reconsideraria, consentimento_saude, pedidos_desligamento(tipo, status, aberto_em)")
    .eq("id", id)
    .maybeSingle();
  if (error) return resultado("questionario", null, error);
  if (!q) return { ok: true as const, data: null };

  const [motivos, respostas, servicos] = await Promise.all([
    supabase.from("questionario_motivos").select("motivo").eq("questionario_id", id),
    supabase.from("questionario_respostas").select("pergunta, valor").eq("questionario_id", id),
    supabase
      .from("servicos_apoio")
      .select("id, nome, descricao, categoria, contato")
      .eq("ativo", true)
      .order("ordem"),
  ]);

  const mapa: Record<string, string | string[]> = {};
  for (const r of respostas.data ?? []) {
    if (typeof r.valor === "string") mapa[r.pergunta] = r.valor;
    else if (Array.isArray(r.valor)) mapa[r.pergunta] = r.valor.filter((v): v is string => typeof v === "string");
  }

  return {
    ok: true as const,
    data: {
      id: q.id,
      status: q.status,
      etapa: q.etapa_atual,
      reconsideraria: q.reconsideraria,
      consentimentoSaude: q.consentimento_saude,
      pedido: q.pedidos_desligamento,
      motivos: (motivos.data ?? []).map((m) => m.motivo as Motivo),
      respostas: mapa,
      servicos: servicos.data ?? [],
    },
  };
}

export type DadosQuestionario = NonNullable<Extract<Awaited<ReturnType<typeof carregarQuestionario>>, { ok: true }>["data"]>;

/** Situação acadêmica do próprio estudante. */
export async function carregarSituacao(userId: string) {
  const supabase = await createClient();
  const { data: estudante, error } = await supabase
    .from("estudantes")
    .select("id, codigo, periodo_atual, situacao, cursos(nome, total_periodos)")
    .eq("perfil_id", userId)
    .maybeSingle();
  if (error) return resultado("situacao", null, error);
  if (!estudante) return { ok: true as const, data: null };

  const [vinculos, corrente, pedidos, servicos, solicitacoes] = await Promise.all([
    supabase
      .from("vinculos_periodo")
      .select("periodos_letivos(codigo, inicio)")
      .eq("estudante_id", estudante.id),
    supabase
      .from("periodos_letivos")
      .select("codigo")
      .eq("encerrado", false)
      .order("inicio", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pedidos_desligamento")
      .select("id, tipo, status, aberto_em, concluido_em, questionarios_desligamento(id, status)")
      .eq("estudante_id", estudante.id)
      .order("aberto_em", { ascending: false }),
    supabase.from("servicos_apoio").select("id, nome, descricao, categoria, contato").eq("ativo", true).order("ordem"),
    supabase
      .from("solicitacoes_apoio")
      .select("id, assunto, status, origem, created_at, servicos_apoio(nome)")
      .eq("estudante_id", estudante.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const semestres = (vinculos.data ?? [])
    .flatMap((v) => (v.periodos_letivos ? [v.periodos_letivos] : []))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const total = estudante.cursos?.total_periodos ?? estudante.periodo_atual;

  return {
    ok: true as const,
    data: {
      codigo: estudante.codigo,
      curso: estudante.cursos?.nome ?? "",
      periodoAtual: estudante.periodo_atual,
      totalPeriodos: total,
      situacao: estudante.situacao,
      ingresso: semestres[0]?.codigo ?? corrente.data?.codigo ?? null,
      previsaoConclusao: corrente.data?.codigo ? somarSemestres(corrente.data.codigo, total - estudante.periodo_atual) : null,
      pedidos: (pedidos.data ?? []).map((p) => ({
        ...p,
        questionario: Array.isArray(p.questionarios_desligamento)
          ? (p.questionarios_desligamento[0] ?? null)
          : p.questionarios_desligamento,
      })),
      servicos: servicos.data ?? [],
      solicitacoes: solicitacoes.data ?? [],
    },
  };
}

/** "2026.2" + 3 semestres = "2028.1". */
function somarSemestres(codigo: string, semestres: number) {
  const [ano, sem] = codigo.split(".").map(Number);
  const indice = ano * 2 + (sem - 1) + semestres;
  return `${Math.floor(indice / 2)}.${(indice % 2) + 1}`;
}

/** Questionários que o estudante ainda pode responder (pedido aberto). */
export async function questionariosPendentes(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("questionarios_desligamento")
    .select("id, status, pedidos_desligamento!inner(tipo, status), estudantes!inner(perfil_id)")
    .in("status", ["pendente", "em_andamento"])
    .eq("pedidos_desligamento.status", "aberto")
    .eq("estudantes.perfil_id", userId);
  return data ?? [];
}
