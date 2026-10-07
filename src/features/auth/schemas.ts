import { z } from "zod";

const email = z
  .string({ error: "Informe seu e-mail institucional." })
  .trim()
  .min(1, "Informe seu e-mail institucional.")
  .email("Informe um e-mail válido.")
  .max(254);

export const loginSchema = z.object({
  email,
  senha: z.string({ error: "Informe sua senha." }).min(1, "Informe sua senha.").max(200),
});

export const recuperarSchema = z.object({ email });

export const novaSenhaSchema = z
  .object({
    senha: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .max(72, "Use no máximo 72 caracteres.")
      .regex(/[A-Za-z]/, "Inclua pelo menos uma letra.")
      .regex(/[0-9]/, "Inclua pelo menos um número."),
    confirmacao: z.string(),
  })
  .refine((v) => v.senha === v.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não conferem.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type NovaSenhaInput = z.infer<typeof novaSenhaSchema>;
