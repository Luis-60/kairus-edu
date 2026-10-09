import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/result";
import type { Motivo } from "./questionario";

export const POR_PAGINA_PEDIDOS = 20;

const primeiro = (v: unknown) => (Array.isArray(v) ? v[0] : v === "" ? undefined : v);

export const filtrosPedidosSchema = z.object({
  status: z.preprocess(primeiro, z.enum(["aberto", "concluido", "revertido", "todos"]).catch("aberto").default("aberto")),
  tipo: z.preprocess(primeiro, z.enum(["trancamento", "cancelamento"]).optional().catch(undefined)),
  questionario: z.preprocess(
    primeiro,
    z.enum(["pendente", "em_andamento", "enviado", "recusado", "encerrado"]).optional().catch(undefined),
  ),
  curso: z.preprocess(primeiro, z.uuid().optional().catch(undefined)),
  semestre: z.preprocess(primeiro, z.string().regex(/^\d{4}\.[12]$/).optional().catch(undefined)),
  pagina: z.preprocess(primeiro, z.coerce.number().int().min(1).max(10_000).catch(1).default(1)),
});

export type FiltrosPedidos = z.infer<typeof filtrosPedidosSchema>;

export function hrefPedidos(f: FiltrosPedidos, mudancas: Partial<Record<keyof FiltrosPedidos, string | number | undefined>>) {
  const final = { ...f, ...mudancas };
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(final)) {
    if (valor === undefined || valor === "" || (chave === "pagina" && valor === 1) || (chave === "status" && valor === "aberto")) continue;
    params.set(chave, String(valor));
  }
  const qs = params.toString();
  return qs ? `/desligamentos?${qs}` : "/desligamentos";
}

/** Data inicial e final do semestre escolhido no filtro. */
async function janelaDoSemestre(codigo?: string) {
  if (!codigo) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("periodos_letivos").select("inicio, fim").eq("codigo", codigo).maybeSingle();
  return data;
}

export async function listarPedidos(f: FiltrosPedidos) {
  const supabase = await createClient();
  let query = supabase
    .from("v_pedidos_desligamento")
    .select(
      "id, codigo, curso_nome, tipo, status, origem, sinalizado_previamente, faixa_no_pedido, questionario_status, aberto_em",
      { count: "exact" },
    );
  if (f.status !== "todos") query = query.eq("status", f.status);
  if (f.tipo) query = query.eq("tipo", f.tipo);
  if (f.questionario) query = query.eq("questionario_status", f.questionario);
  if (f.curso) query = query.eq("curso_id", f.curso);
  const janela = await janelaDoSemestre(f.semestre);
  if (janela) query = query.gte("aberto_em", janela.inicio).lte("aberto_em", `${janela.fim}T23:59:59`);

  const inicio = (f.pagina - 1) * POR_PAGINA_PEDIDOS;
  const { data, error, count } = await query
    .order("aberto_em", { ascending: false })
    .range(inicio, inicio + POR_PAGINA_PEDIDOS - 1);

  const r = resultado("desligamento", data, error);
  return r.ok ? { ok: true as const, data: r.data, total: count ?? 0 } : r;
}

/** Contagens do recorte filtrado (a RLS aplica o escopo do papel). */
export async function resumoPedidos(f: FiltrosPedidos) {
  const supabase = await createClient();
  const janela = await janelaDoSemestre(f.semestre);
  const base = () => {
    let q = supabase.from("v_pedidos_desligamento").select("id", { count: "exact", head: true });
    if (f.tipo) q = q.eq("tipo", f.tipo);
    if (f.curso) q = q.eq("curso_id", f.curso);
    if (janela) q = q.gte("aberto_em", janela.inicio).lte("aberto_em", `${janela.fim}T23:59:59`);
    return q;
  };
  const [abertos, respondidos, sinalizados] = await Promise.all([
    base().eq("status", "aberto"),
    base().eq("status", "aberto").eq("questionario_status", "enviado"),
    base().eq("status", "aberto").eq("sinalizado_previamente", true),
  ]);
  const erro = abertos.error ?? respondidos.error ?? sinalizados.error;
  return resultado(
    "desligamento",
    erro ? null : { abertos: abertos.count ?? 0, respondidos: respondidos.count ?? 0, sinalizados: sinalizados.count ?? 0 },
    erro,
  );
}

const painelSchema = z.object({
  minimo: z.number(),
  pedidos: z.number(),
  abertos: z.number(),
  respondidos: z.number(),
  sinalizados: z.number(),
  revertidos: z.number(),
  apoio_gerado: z.number(),
  motivos: z.array(z.object({ motivo: z.string(), total: z.number(), pct: z.number() })).nullable(),
  reconsideracao: z.record(z.string(), z.number()).nullable(),
  por_curso: z.array(
    z.object({ curso: z.string(), respondidos: z.number(), principal: z.string().nullable(), pct_principal: z.number().nullable() }),
  ),
  por_semestre: z.array(z.object({ semestre: z.string(), pedidos: z.number(), respondidos: z.number() })),
  risco_x_motivo: z.array(
    z.object({
      sinalizado: z.boolean(),
      respondidos: z.number(),
      motivos: z.array(z.object({ motivo: z.string(), pct: z.number() })).nullable(),
    }),
  ),
});

export type PainelDesligamento = z.infer<typeof painelSchema>;

/** Indicadores agregados (gestão e equipe de apoio). A função no banco aplica o mínimo de 5. */
export async function painelDesligamento(f: FiltrosPedidos) {
  const supabase = await createClient();
  const janela = await janelaDoSemestre(f.semestre);
  const { data, error } = await supabase.rpc("painel_desligamento", {
    p_curso: f.curso,
    p_tipo: f.tipo,
    p_desde: janela?.inicio,
  });
  if (error) {
    console.error("[desligamento] falha no painel", error.code);
    return { ok: false as const };
  }
  const parsed = painelSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[desligamento] painel em formato inesperado");
    return { ok: false as const };
  }
  return { ok: true as const, data: parsed.data };
}

/** Pedido e, se o usuário tiver autorização, as respostas individuais (nunca as de saúde). */
export async function carregarPedido(id: string) {
  const supabase = await createClient();
  const { data: pedido, error } = await supabase
    .from("v_pedidos_desligamento")
    .select("id, codigo, curso_nome, tipo, status, origem, sinalizado_previamente, faixa_no_pedido, questionario_status, reconsideraria, aberto_em, concluido_em")
    .eq("id", id)
    .maybeSingle();
  if (error) return resultado("desligamento", null, error);
  if (!pedido) return { ok: true as const, data: null };

  const { data: q } = await supabase.from("questionarios_desligamento").select("id, enviado_em").eq("pedido_id", id).maybeSingle();

  let respostas: { autorizado: boolean; motivos: Motivo[]; valores: Record<string, unknown> } = {
    autorizado: false,
    motivos: [],
    valores: {},
  };
  if (q && pedido.questionario_status === "enviado") {
    const { data: autorizado } = await supabase.rpc("registrar_leitura_questionario", { p_questionario: q.id });
    if (autorizado) {
      const [motivos, valores] = await Promise.all([
        supabase.from("questionario_motivos").select("motivo").eq("questionario_id", q.id),
        supabase.from("questionario_respostas").select("pergunta, valor").eq("questionario_id", q.id),
      ]);
      respostas = {
        autorizado: true,
        motivos: (motivos.data ?? []).map((m) => m.motivo as Motivo),
        valores: Object.fromEntries((valores.data ?? []).map((v) => [v.pergunta, v.valor])),
      };
    }
  }

  return { ok: true as const, data: { ...pedido, enviadoEm: q?.enviado_em ?? null, respostas } };
}
