import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/features/auth/auth-frame";
import { RedefinirForm } from "@/features/auth/redefinir-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Definir nova senha" };

/** Acessada pelo link de recuperação ou convite, que já cria a sessão. */
export default async function RedefinirSenhaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?erro=link");

  return (
    <AuthFrame>
      <RedefinirForm />
    </AuthFrame>
  );
}
