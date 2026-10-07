import type { Metadata } from "next";
import { AuthFrame } from "@/features/auth/auth-frame";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  sessao: "Sua sessão expirou ou não está mais ativa. Entre novamente.",
  link: "O link usado é inválido ou expirou. Solicite um novo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const erro = typeof params.erro === "string" ? AVISOS[params.erro] : undefined;

  return (
    <AuthFrame>
      <LoginForm next={next} aviso={erro} />
    </AuthFrame>
  );
}
