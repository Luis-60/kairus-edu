import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const contagem = z.number().nullable();

const painelSchema = z.object({
  minimo: z.number(),
  ativos: z.number(),
  com_perfil: contagem,
  completos: contagem,
  com_curriculo: contagem,
  versoes: contagem,
  competencias: z.array(z.object({ nome: z.string(), alunos: z.number() })),
  interesses: z.array(z.object({ area: z.string(), alunos: z.number() })),
  tipos_vaga: z.array(z.object({ tipo: z.string(), alunos: z.number() })),
  lacunas: z.array(z.object({ nome: z.string(), alunos: z.number() })),
  por_curso: z.array(z.object({ curso: z.string(), ativos: z.number(), com_perfil: contagem, com_curriculo: contagem })),
});

export type PainelEmpregabilidade = z.infer<typeof painelSchema>;

/** Indicadores agregados de empregabilidade. Grupos com menos de 5 alunos vêm nulos ou omitidos. */
export async function carregarEmpregabilidade(curso?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("painel_empregabilidade", curso ? { p_curso: curso } : {});
  if (error) {
    console.error("[empregabilidade] falha no painel", error.code);
    return { ok: false as const };
  }
  const parsed = painelSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[empregabilidade] formato inesperado");
    return { ok: false as const };
  }
  return { ok: true as const, data: parsed.data };
}
