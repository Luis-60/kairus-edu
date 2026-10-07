import type { Metadata } from "next";
import { AuthFrame } from "@/features/auth/auth-frame";
import { RecuperarForm } from "@/features/auth/recuperar-form";

export const metadata: Metadata = { title: "Recuperar acesso" };

export default function RecuperarSenhaPage() {
  return (
    <AuthFrame>
      <RecuperarForm />
    </AuthFrame>
  );
}
