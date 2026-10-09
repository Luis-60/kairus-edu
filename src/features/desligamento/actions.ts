"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  LIMITE_TEXTO,
  MOTIVOS,
  normalizarResposta,
  PERGUNTA_OUTRO,
  PERGUNTA_SERVICOS,
  PERGUNTAS_POR_MOTIVO,
  perguntaPorId,
  type Motivo,
} from "./questionario";

export type SalvarResultado = { ok: true; salvoEm: string } | { ok: false; message: string };

const SEM_PERMISSAO = { ok: false as const, message: "Você não tem permissão para esta operação." };
const FINALIZADO = { ok: false as const, message: "Este questionário já foi finalizado." };

const salvarSchema = z.object({
  questionarioId: z.uuid(),
  etapa: z.number().int().min(1).max(5),
  consentimentoSaude: z.boolean().optional(),
  motivos: z.array(z.enum(MOTIVOS as [Motivo, ...Motivo[]])).max(MOTIVOS.length).optional(),
  respostas: z.record(z.string().max(60), z.string().max(LIMITE_TEXTO).nullable()).optional(),
  servicos: z.array(z.uuid()).max(20).optional(),
  reconsideraria: z.enum(["sim", "talvez", "nao", "prefiro_nao_responder"]).nullable().optional(),
});

export type SalvarEntrada = z.infer<typeof salvarSchema>;

/**
 * Salva parcialmente o questionário (salvamento automático). Só o próprio estudante, e só
 * enquanto o questionário estiver aberto; o banco reforça as duas regras.
 */
export async function salvarQuestionario(entrada: SalvarEntrada): Promise<SalvarResultado> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return SEM_PERMISSAO;

  const parsed = salvarSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, message: "Algumas respostas estão em um formato inválido." };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: q } = await supabase
    .from("questionarios_desligamento")
    .select("id, instituicao_id, status, consentimento_saude")
    .eq("id", d.questionarioId)
    .maybeSingle();
  if (!q) return SEM_PERMISSAO;
  if (q.status !== "pendente" && q.status !== "em_andamento") return FINALIZADO;

  let consentimento = q.consentimento_saude;
  const atualizacao: { status?: "em_andamento"; etapa_atual: number; consentimento_saude?: boolean; reconsideraria?: SalvarEntrada["reconsideraria"] } = {
    etapa_atual: d.etapa,
  };
  if (q.status === "pendente") atualizacao.status = "em_andamento";
  if (d.consentimentoSaude !== undefined && d.consentimentoSaude !== q.consentimento_saude) {
    atualizacao.consentimento_saude = d.consentimentoSaude;
    consentimento = d.consentimentoSaude;
  }
  if (d.reconsideraria !== undefined) atualizacao.reconsideraria = d.reconsideraria;

  // Atualiza primeiro o questionário: retirar o consentimento apaga os dados de saúde no banco.
  const { error: erroQ } = await supabase.from("questionarios_desligamento").update(atualizacao).eq("id", q.id);
  if (erroQ) return falha("atualizar", erroQ.code);

  if (d.motivos) {
    if (d.motivos.includes("saude") && !consentimento) {
      return { ok: false, message: "Para informar um motivo de saúde, marque o consentimento específico." };
    }
    const { data: atuais } = await supabase.from("questionario_motivos").select("motivo").eq("questionario_id", q.id);
    const existentes = new Set((atuais ?? []).map((m) => m.motivo));
    const remover = [...existentes].filter((m) => !d.motivos!.includes(m as Motivo));
    const incluir = d.motivos.filter((m) => !existentes.has(m));
    if (remover.length) {
      const { error } = await supabase.from("questionario_motivos").delete().eq("questionario_id", q.id).in("motivo", remover);
      if (error) return falha("motivos", error.code);
      // Respostas de contexto de motivos desmarcados deixam de valer.
      const perguntas = remover.flatMap((m) => contextoDoMotivo(m as Motivo));
      if (perguntas.length) {
        await supabase.from("questionario_respostas").delete().eq("questionario_id", q.id).in("pergunta", perguntas);
      }
    }
    if (incluir.length) {
      const { error } = await supabase
        .from("questionario_motivos")
        .insert(incluir.map((motivo) => ({ questionario_id: q.id, instituicao_id: q.instituicao_id, motivo })));
      if (error) return falha("motivos", error.code);
    }
  }

  if (d.respostas) {
    const gravar: { questionario_id: string; instituicao_id: string; pergunta: string; valor: string; saude: boolean }[] = [];
    const apagar: string[] = [];
    for (const [id, valor] of Object.entries(d.respostas)) {
      const pergunta = perguntaPorId(id);
      if (!pergunta) continue;
      if (valor === null || valor.trim() === "") {
        apagar.push(id);
        continue;
      }
      const normalizado = normalizarResposta(id, valor);
      if (normalizado === null) return { ok: false, message: "Uma das respostas não é válida." };
      if (pergunta.saude && !consentimento) continue;
      gravar.push({ questionario_id: q.id, instituicao_id: q.instituicao_id, pergunta: id, valor: normalizado, saude: Boolean(pergunta.saude) });
    }
    if (apagar.length) {
      await supabase.from("questionario_respostas").delete().eq("questionario_id", q.id).in("pergunta", apagar);
    }
    if (gravar.length) {
      const { error } = await supabase.from("questionario_respostas").upsert(gravar, { onConflict: "questionario_id,pergunta" });
      if (error) return falha("respostas", error.code);
    }
  }

  if (d.servicos) {
    // Só serviços que a instituição oferece de fato.
    const { data: validos } = d.servicos.length
      ? await supabase.from("servicos_apoio").select("id").eq("ativo", true).in("id", d.servicos)
      : { data: [] };
    const ids = (validos ?? []).map((s) => s.id);
    if (ids.length) {
      const { error } = await supabase
        .from("questionario_respostas")
        .upsert(
          { questionario_id: q.id, instituicao_id: q.instituicao_id, pergunta: PERGUNTA_SERVICOS, valor: ids, saude: false },
          { onConflict: "questionario_id,pergunta" },
        );
      if (error) return falha("servicos", error.code);
    } else {
      await supabase.from("questionario_respostas").delete().eq("questionario_id", q.id).eq("pergunta", PERGUNTA_SERVICOS);
    }
  }

  return { ok: true, salvoEm: new Date().toISOString() };
}

/** Perguntas que só existem quando o motivo está marcado. */
function contextoDoMotivo(motivo: Motivo): string[] {
  const ids = (PERGUNTAS_POR_MOTIVO[motivo] ?? []).map((p) => p.id);
  return motivo === "outro" ? [...ids, PERGUNTA_OUTRO.id] : ids;
}

function falha(etapa: string, codigo?: string): SalvarResultado {
  console.error(`[questionario] falha ao ${etapa}`, codigo ?? "desconhecido");
  return { ok: false, message: "Não foi possível salvar agora. Suas respostas anteriores continuam guardadas." };
}

const MAPA_ASSUNTO = { financeiro: "financeiro", horario: "grade" } as const;

/** Envia o questionário. Pedidos de apoio são abertos para os serviços que o estudante escolheu. */
export async function enviarQuestionario(questionarioId: string): Promise<SalvarResultado> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return SEM_PERMISSAO;
  if (!z.uuid().safeParse(questionarioId).success) return SEM_PERMISSAO;

  const supabase = await createClient();
  const { data: q } = await supabase
    .from("questionarios_desligamento")
    .select("id, instituicao_id, estudante_id, status, reconsideraria")
    .eq("id", questionarioId)
    .maybeSingle();
  if (!q) return SEM_PERMISSAO;
  if (q.status !== "pendente" && q.status !== "em_andamento") return FINALIZADO;

  const { error } = await supabase
    .from("questionarios_desligamento")
    .update({ status: "enviado", ciencia_em: new Date().toISOString(), etapa_atual: 5 })
    .eq("id", q.id);
  if (error) {
    if (error.code === "23514") return { ok: false, message: "Selecione ao menos um motivo antes de enviar." };
    return falha("enviar", error.code);
  }

  if (q.reconsideraria === "sim" || q.reconsideraria === "talvez") {
    const { data: escolha } = await supabase
      .from("questionario_respostas")
      .select("valor")
      .eq("questionario_id", q.id)
      .eq("pergunta", PERGUNTA_SERVICOS)
      .maybeSingle();
    const ids = Array.isArray(escolha?.valor) ? escolha.valor.filter((v): v is string => typeof v === "string") : [];
    if (ids.length) {
      const { data: servicos } = await supabase.from("servicos_apoio").select("id, nome, categoria").in("id", ids);
      const pedidos = (servicos ?? []).map((s) => ({
        instituicao_id: q.instituicao_id,
        estudante_id: q.estudante_id,
        assunto: (MAPA_ASSUNTO as Record<string, "financeiro" | "grade">)[s.categoria] ?? ("outro" as const),
        mensagem: `Pedido de contato feito no questionário de desligamento: ${s.nome}.`,
        origem: "pesquisa",
        servico_id: s.id,
      }));
      if (pedidos.length) {
        const { error: erroApoio } = await supabase.from("solicitacoes_apoio").insert(pedidos);
        if (erroApoio) console.error("[questionario] falha ao abrir pedidos de apoio", erroApoio.code);
      }
    }
  }

  revalidatePath("/situacao-academica");
  revalidatePath("/minha-jornada");
  return { ok: true, salvoEm: new Date().toISOString() };
}

/** O estudante pode não responder; isso não interfere no pedido. */
export async function recusarQuestionario(questionarioId: string): Promise<SalvarResultado> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return SEM_PERMISSAO;
  if (!z.uuid().safeParse(questionarioId).success) return SEM_PERMISSAO;

  const supabase = await createClient();
  // Descarta o que já foi salvo antes de encerrar (as políticas só permitem isso com o questionário aberto).
  await supabase.from("questionario_respostas").delete().eq("questionario_id", questionarioId);
  await supabase.from("questionario_motivos").delete().eq("questionario_id", questionarioId);
  const { data, error } = await supabase
    .from("questionarios_desligamento")
    .update({ status: "recusado", reconsideraria: null, consentimento_saude: false })
    .eq("id", questionarioId)
    .in("status", ["pendente", "em_andamento"])
    .select("id")
    .maybeSingle();
  if (error || !data) return error ? falha("recusar", error.code) : FINALIZADO;

  revalidatePath("/situacao-academica");
  revalidatePath("/minha-jornada");
  return { ok: true, salvoEm: new Date().toISOString() };
}
