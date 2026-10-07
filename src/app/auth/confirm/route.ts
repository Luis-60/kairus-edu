import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIPOS: EmailOtpType[] = ["recovery", "invite", "email"];
const DESTINOS = new Set(["/redefinir-senha", "/inicio"]);

/** Valida o token_hash enviado por e-mail (recuperação de senha ou convite). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = params.get("next") ?? "/inicio";

  if (tokenHash && type && TIPOS.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(DESTINOS.has(next) ? next : "/inicio", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?erro=link", request.url));
}
