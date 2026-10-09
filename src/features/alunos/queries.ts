import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/result";
import type { Papel } from "@/lib/auth/roles";
import { POR_PAGINA, type Filtros } from "./filtros";

export type Fator = { fator: string; peso: number };

function lerFatores(valor: unknown): Fator[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (item && typeof item === "object" && "fator" in item && "peso" in item) {
      const { fator, peso } = item as { fator: unknown; peso: unknown };
      if (typeof fator === "string" && typeof peso === "number") return [{ fator, peso }];
    }
    return [];
  });
}

/** Cursos que o usuário pode filtrar: todos (gestão) ou os que coordena. */
export async function cursosVisiveis(papel: Papel) {
  const supabase = await createClient();
  if (papel === "gestor" || papel === "apoio") {
    const { data, error } = await supabase.from("cursos").select("id, nome").order("nome");
    return resultado("alunos", data, error);
  }
  const { data, error } = await supabase
    .from("coordenacoes_curso")
    .select("cursos(id, nome)")
    .order("curso_id");
  return resultado(
    "alunos",
    data?.flatMap((c) => (c.cursos ? [c.cursos] : [])).sort((a, b) => a.nome.localeCompare(b.nome)) ?? null,
    error,
  );
}

export async function periodoCorrente() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("periodos_letivos")
    .select("codigo")
    .eq("encerrado", false)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.codigo ?? null;
}

export async function listarCarteira(filtros: Filtros) {
  const supabase = await createClient();
  let query = supabase
    .from("v_carteira")
    .select("estudante_id, codigo, curso_nome, periodo_atual, probabilidade, faixa, situacao_acao", { count: "exact" });

  if (filtros.q) query = query.ilike("codigo", `%${filtros.q}%`);
  if (filtros.faixa) query = query.eq("faixa", filtros.faixa);
  if (filtros.acao) query = query.eq("situacao_acao", filtros.acao);
  if (filtros.periodo) query = query.eq("periodo_atual", filtros.periodo);
  if (filtros.curso) query = query.eq("curso_id", filtros.curso);

  const inicio = (filtros.pagina - 1) * POR_PAGINA;
  const { data, error, count } = await query
    .order("probabilidade", { ascending: false, nullsFirst: false })
    .order("codigo")
    .range(inicio, inicio + POR_PAGINA - 1);

  const r = resultado("alunos", data, error);
  return r.ok ? { ok: true as const, data: r.data, total: count ?? 0 } : r;
}

export async function resumoCarteira(curso?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("carteira_resumo", curso ? { p_curso: curso } : {}).maybeSingle();
  return resultado("alunos", data, error);
}

/** Ficha do aluno. A função no banco registra o acesso na auditoria. */
export async function abrirFicha(codigo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("abrir_ficha", { p_codigo: codigo }).maybeSingle();
  if (error) return resultado("ficha", null, error);
  if (!data) return { ok: true as const, data: null };

  const [acoes, solicitacoes] = await Promise.all([
    supabase
      .from("v_acoes")
      .select("id, tipo, descricao, responsavel_nome, prazo, status, created_at")
      .eq("estudante_id", data.estudante_id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("v_solicitacoes_apoio")
      .select("id, assunto, mensagem, status, created_at")
      .eq("estudante_id", data.estudante_id)
      .neq("status", "encerrada")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    ok: true as const,
    data: {
      ...data,
      fatores: lerFatores(data.fatores),
      acoes: acoes.data ?? [],
      solicitacoes: solicitacoes.data ?? [],
    },
  };
}

/** Membros da equipe que podem ser responsáveis por uma ação. */
export async function equipe() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, papel")
    .in("papel", ["gestor", "coordenador"])
    .eq("ativo", true)
    .order("nome");
  return resultado("alunos", data, error);
}

export type FichaAluno = NonNullable<Extract<Awaited<ReturnType<typeof abrirFicha>>, { ok: true }>["data"]>;
