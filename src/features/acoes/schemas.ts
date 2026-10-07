import { z } from "zod";

export const TIPOS_ACAO = ["conversa_individual", "tutoria", "apoio_financeiro", "monitoria", "ajuste_grade", "outro"] as const;
export const STATUS_ACAO = ["pendente", "em_andamento", "concluida", "cancelada"] as const;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export const novaAcaoSchema = z.object({
  estudanteId: z.uuid(),
  tipo: z.enum(TIPOS_ACAO, { error: "Escolha o tipo de ação." }),
  descricao: z
    .string()
    .trim()
    .min(3, "Descreva a ação em poucas palavras.")
    .max(1000, "Use no máximo 1000 caracteres."),
  responsavelId: z.uuid({ error: "Escolha o responsável." }),
  prazo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o prazo.")
    .refine((v) => v >= hojeISO(), "O prazo não pode estar no passado."),
});

export type NovaAcaoInput = z.infer<typeof novaAcaoSchema>;

export const statusAcaoSchema = z.object({
  acaoId: z.uuid(),
  status: z.enum(STATUS_ACAO),
});
