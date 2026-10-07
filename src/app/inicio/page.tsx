import { redirect } from "next/navigation";
import { homeFor, requireSessao } from "@/lib/auth/session";

/** Ponto de entrada após o login: envia cada papel para a sua tela inicial. */
export default async function InicioPage() {
  const sessao = await requireSessao();
  redirect(homeFor(sessao.papel));
}
