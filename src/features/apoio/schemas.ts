import { z } from "zod";

export const ASSUNTOS = ["frequencia", "financeiro", "grade", "trancamento", "outro"] as const;

export const novaSolicitacaoSchema = z.object({
  assunto: z.enum(ASSUNTOS, { error: "Escolha o assunto." }),
  mensagem: z
    .string()
    .trim()
    .min(10, "Conte um pouco mais, com pelo menos 10 caracteres.")
    .max(1000, "Use no máximo 1000 caracteres."),
});

export type NovaSolicitacaoInput = z.infer<typeof novaSolicitacaoSchema>;
