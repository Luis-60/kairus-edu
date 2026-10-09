import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CurriculoAbas } from "@/features/curriculo/abas";
import { EditorCurriculo, GerarRascunho } from "@/features/curriculo/editor";
import { ListaArquivos } from "@/features/curriculo/lista-arquivos";
import { carregarPerfilCompleto } from "@/features/curriculo/queries";
import { requirePapel } from "@/lib/auth/session";
import { dataCurta } from "@/lib/format";

export const metadata: Metadata = { title: "Editor de currículo" };

export default async function EditorPage() {
  const sessao = await requirePapel("estudante");
  const r = await carregarPerfilCompleto(sessao.userId);
  if (!r.ok) return <ErrorState />;
  if (!r.data) return <EmptyState title="Sua matrícula ainda não está vinculada a esta conta." />;
  const p = r.data;
  const analises = p.analises.map((a) => ({ id: a.id, titulo: a.titulo }));

  return (
    <>
      <PageHeader eyebrow="Currículo" title="Seu currículo" />
      <CurriculoAbas atual="/curriculo/editor" />

      <Panel title={p.rascunho ? "Rascunho" : "Montar o currículo"} description={p.rascunho ? "Revise e edite antes de gerar o PDF." : undefined}>
        <GerarRascunho analises={analises} temRascunho={Boolean(p.rascunho)} />
      </Panel>

      {p.rascunho && <EditorCurriculo key={p.perfil?.rascunho_gerado_em ?? "rascunho"} inicial={p.rascunho} analises={analises} />}

      <Panel title="Versões geradas" description="Cada PDF gerado fica guardado. Só você pode baixar.">
        <ListaArquivos
          vazio="Nenhum PDF gerado ainda."
          itens={p.versoes.map((v) => ({
            id: v.id,
            tipo: "versao" as const,
            titulo: v.titulo,
            detalhe: [`Gerada em ${dataCurta(v.created_at)}`, v.modelo === "compacto" ? "modelo compacto" : "modelo clássico", v.vaga_alvo ? `adaptada para ${v.vaga_alvo}` : ""]
              .filter(Boolean)
              .join(" · "),
            pontuacao: typeof (v.scan as { pontuacao?: unknown } | null)?.pontuacao === "number" ? (v.scan as { pontuacao: number }).pontuacao : null,
          }))}
        />
      </Panel>
    </>
  );
}
