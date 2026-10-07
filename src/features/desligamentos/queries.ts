import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/result";

export const POR_PAGINA_PEDIDOS = 20;

const primeiro = (v: unknown) => (Array.isArray(v) ? v[0] : v === "" ? undefined : v);

export const filtrosPedidosSchema = z.object({
  status: z.preprocess(primeiro, z.enum(["aberto", "concluido", "todos"]).catch("aberto").default("aberto")),
  pagina: z.preprocess(primeiro, z.coerce.number().int().min(1).max(10_000).catch(1).default(1)),
});

export type FiltrosPedidos = z.infer<typeof filtrosPedidosSchema>;

export function hrefPedidos(f: FiltrosPedidos, mudancas: Partial<FiltrosPedidos>) {
  const final = { ...f, ...mudancas };
  const params = new URLSearchParams();
  if (final.status !== "aberto") params.set("status", final.status);
  if (final.pagina !== 1) params.set("pagina", String(final.pagina));
  const qs = params.toString();
  return qs ? `/desligamentos?${qs}` : "/desligamentos";
}

/** Contagens dos pedidos em aberto (escopo do papel aplicado pela RLS). */
export async function resumoPedidosAbertos() {
  const supabase = await createClient();
  const base = () =>
    supabase.from("v_pedidos_desligamento").select("id", { count: "exact", head: true }).eq("status", "aberto");

  const [abertos, respondidos, sinalizados] = await Promise.all([
    base(),
    base().eq("pesquisa_respondida", true),
    base().eq("sinalizado_previamente", true),
  ]);

  const erro = abertos.error ?? respondidos.error ?? sinalizados.error;
  return resultado(
    "desligamentos",
    erro ? null : { abertos: abertos.count ?? 0, respondidos: respondidos.count ?? 0, sinalizados: sinalizados.count ?? 0 },
    erro,
  );
}

export async function listarPedidos(f: FiltrosPedidos) {
  const supabase = await createClient();
  let query = supabase
    .from("v_pedidos_desligamento")
    .select("id, codigo, curso_nome, tipo, status, sinalizado_previamente, pesquisa_respondida, aberto_em", {
      count: "exact",
    });
  if (f.status !== "todos") query = query.eq("status", f.status);

  const inicio = (f.pagina - 1) * POR_PAGINA_PEDIDOS;
  const { data, error, count } = await query
    .order("aberto_em", { ascending: false })
    .range(inicio, inicio + POR_PAGINA_PEDIDOS - 1);

  const r = resultado("desligamentos", data, error);
  return r.ok ? { ok: true as const, data: r.data, total: count ?? 0 } : r;
}

/** Motivos agregados (somente gestão; a função no banco recusa outros papéis). */
export async function motivosAgregados() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("painel_motivos");
  return resultado("desligamentos", data, error);
}
