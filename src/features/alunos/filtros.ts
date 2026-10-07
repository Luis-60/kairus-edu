import { z } from "zod";

export const POR_PAGINA = 20;

const vazioParaUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);
const primeiro = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/** Filtros da carteira vindos da URL. Valores inválidos são descartados, nunca causam erro. */
export const filtrosSchema = z.object({
  q: z.preprocess(
    (v) => vazioParaUndefined(primeiro(v)),
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{1,12}$/)
      .optional()
      .catch(undefined),
  ),
  faixa: z.preprocess((v) => vazioParaUndefined(primeiro(v)), z.enum(["alto", "atencao", "baixo"]).optional().catch(undefined)),
  acao: z.preprocess(
    (v) => vazioParaUndefined(primeiro(v)),
    z.enum(["pendente", "registrada", "nao_se_aplica"]).optional().catch(undefined),
  ),
  periodo: z.preprocess(
    (v) => vazioParaUndefined(primeiro(v)),
    z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  ),
  curso: z.preprocess((v) => vazioParaUndefined(primeiro(v)), z.uuid().optional().catch(undefined)),
  pagina: z.preprocess((v) => vazioParaUndefined(primeiro(v)), z.coerce.number().int().min(1).max(10_000).catch(1).default(1)),
  aluno: z.preprocess(
    (v) => vazioParaUndefined(primeiro(v)),
    z.string().toUpperCase().regex(/^[A-Z0-9]{4,12}$/).optional().catch(undefined),
  ),
});

export type Filtros = z.infer<typeof filtrosSchema>;

/** Monta a URL da carteira preservando os filtros atuais. */
export function hrefCarteira(filtros: Filtros, mudancas: Partial<Record<keyof Filtros, string | number | undefined>>) {
  const params = new URLSearchParams();
  const final = { ...filtros, ...mudancas };
  for (const [chave, valor] of Object.entries(final)) {
    if (valor === undefined || valor === "" || (chave === "pagina" && valor === 1)) continue;
    params.set(chave, String(valor));
  }
  const qs = params.toString();
  return qs ? `/alunos?${qs}` : "/alunos";
}
