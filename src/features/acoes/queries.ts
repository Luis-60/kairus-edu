import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/result";

export const POR_PAGINA_ACOES = 20;

const primeiro = (v: unknown) => (Array.isArray(v) ? v[0] : v === "" ? undefined : v);

export const filtrosAcoesSchema = z.object({
  aba: z.preprocess(primeiro, z.enum(["acoes", "apoio"]).catch("acoes").default("acoes")),
  status: z.preprocess(
    primeiro,
    z.enum(["abertas", "pendente", "em_andamento", "concluida", "cancelada", "todas"]).catch("abertas").default("abertas"),
  ),
  minhas: z.preprocess(primeiro, z.enum(["1"]).optional().catch(undefined)),
  pagina: z.preprocess(primeiro, z.coerce.number().int().min(1).max(10_000).catch(1).default(1)),
});

export type FiltrosAcoes = z.infer<typeof filtrosAcoesSchema>;

export function hrefAcoes(f: FiltrosAcoes, mudancas: Partial<Record<keyof FiltrosAcoes, string | number | undefined>>) {
  const final = { ...f, ...mudancas };
  const params = new URLSearchParams();
  if (final.aba !== "acoes") params.set("aba", String(final.aba));
  if (final.aba === "acoes" && final.status !== "abertas") params.set("status", String(final.status));
  if (final.aba === "acoes" && final.minhas) params.set("minhas", "1");
  if (final.pagina !== 1) params.set("pagina", String(final.pagina));
  const qs = params.toString();
  return qs ? `/acoes?${qs}` : "/acoes";
}

export async function listarAcoes(f: FiltrosAcoes, usuarioId: string) {
  const supabase = await createClient();
  let query = supabase
    .from("v_acoes")
    .select("id, codigo, curso_nome, tipo, descricao, responsavel_nome, responsavel_id, prazo, status", { count: "exact" });

  if (f.status === "abertas") query = query.in("status", ["pendente", "em_andamento"]);
  else if (f.status !== "todas") query = query.eq("status", f.status);
  if (f.minhas) query = query.eq("responsavel_id", usuarioId);

  const inicio = (f.pagina - 1) * POR_PAGINA_ACOES;
  const { data, error, count } = await query
    .order("prazo", { ascending: true })
    .order("created_at", { ascending: false })
    .range(inicio, inicio + POR_PAGINA_ACOES - 1);

  const r = resultado("acoes", data, error);
  return r.ok ? { ok: true as const, data: r.data, total: count ?? 0 } : r;
}

export async function listarSolicitacoes(pagina: number) {
  const supabase = await createClient();
  const inicio = (pagina - 1) * POR_PAGINA_ACOES;
  const { data, error, count } = await supabase
    .from("v_solicitacoes_apoio")
    .select("id, codigo, curso_nome, assunto, mensagem, status, created_at", { count: "exact" })
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .range(inicio, inicio + POR_PAGINA_ACOES - 1);

  const r = resultado("apoio", data, error);
  return r.ok ? { ok: true as const, data: r.data, total: count ?? 0 } : r;
}

export async function contarSolicitacoesAbertas() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("solicitacoes_apoio")
    .select("id", { count: "exact", head: true })
    .eq("status", "aberta");
  return count ?? 0;
}
