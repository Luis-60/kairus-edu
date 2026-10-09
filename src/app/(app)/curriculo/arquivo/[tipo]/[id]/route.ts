import { NextResponse, type NextRequest } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Download de currículo por URL assinada de 60 segundos. A leitura do registro passa pela RLS,
 * então só o próprio estudante obtém o link; o caminho no Storage nunca é exposto.
 */
export async function GET(_request: NextRequest, { params }: RouteContext<"/curriculo/arquivo/[tipo]/[id]">) {
  const { tipo, id } = await params;
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return new NextResponse("Acesso não permitido.", { status: 403 });
  if (!["versao", "enviado"].includes(tipo) || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Não encontrado.", { status: 404 });
  }

  const supabase = await createClient();
  const registro =
    tipo === "versao"
      ? (await supabase.from("curriculo_versoes").select("storage_path, titulo").eq("id", id).maybeSingle()).data
      : (await supabase.from("curriculos_enviados").select("storage_path, titulo:nome_exibicao").eq("id", id).maybeSingle()).data;
  if (!registro) return new NextResponse("Não encontrado.", { status: 404 });

  const extensao = registro.storage_path.split(".").pop() ?? "pdf";
  const base = registro.titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  const nome = base.endsWith(`.${extensao}`) ? base : `${base || "curriculo"}.${extensao}`;

  const { data, error } = await supabase.storage.from("curriculos").createSignedUrl(registro.storage_path, 60, { download: nome });
  if (error || !data) return new NextResponse("Não foi possível gerar o link.", { status: 500 });

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
