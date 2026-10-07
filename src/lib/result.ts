export type Resultado<T> = { ok: true; data: T } | { ok: false };

/**
 * Normaliza a resposta do Supabase. Registra apenas o código do erro, nunca dados da consulta.
 */
export function resultado<T>(contexto: string, data: T | null, error: { code?: string } | null): Resultado<T> {
  if (error || data === null) {
    if (error) console.error(`[${contexto}] falha na consulta`, error.code ?? "desconhecido");
    return { ok: false };
  }
  return { ok: true, data };
}
