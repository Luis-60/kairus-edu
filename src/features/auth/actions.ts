"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { homeFor } from "@/lib/auth/roles";
import { loginSchema, novaSenhaSchema, recuperarSchema } from "./schemas";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

function primeiroErro(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: Record<string, string> = {};
  for (const issue of issues) {
    const campo = String(issue.path[0] ?? "");
    if (campo && !erros[campo]) erros[campo] = issue.message;
  }
  return erros;
}

/** Aceita apenas caminhos internos para evitar open redirect. */
function destinoSeguro(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export async function entrar(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: primeiroErro(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error || !data.user) {
    // Mensagem genérica: não revela se o e-mail existe.
    return { status: "error", message: "E-mail ou senha incorretos." };
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel, ativo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!perfil || !perfil.ativo) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Sua conta ainda não tem acesso liberado. Procure a gestão da sua instituição.",
    };
  }

  redirect(destinoSeguro(formData.get("next")) ?? homeFor(perfil.papel));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function solicitarRecuperacao(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = recuperarSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: primeiroErro(parsed.error.issues) };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/redefinir-senha`,
  });

  // Mesma resposta exista ou não a conta.
  return {
    status: "success",
    message: "Se houver uma conta com este e-mail, você receberá um link para definir uma nova senha.",
  };
}

export async function redefinirSenha(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = novaSenhaSchema.safeParse({
    senha: formData.get("senha"),
    confirmacao: formData.get("confirmacao"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: primeiroErro(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível salvar a nova senha. Abra o link do e-mail novamente.",
    };
  }

  redirect("/inicio");
}
