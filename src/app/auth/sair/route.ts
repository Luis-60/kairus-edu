import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ERROS = new Set(["sessao", "link"]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const erro = request.nextUrl.searchParams.get("erro");
  const destino = new URL("/login", request.url);
  if (erro && ERROS.has(erro)) destino.searchParams.set("erro", erro);
  return NextResponse.redirect(destino);
}
