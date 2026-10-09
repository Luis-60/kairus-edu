import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, DownloadLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CurriculoAbas } from "@/features/curriculo/abas";
import { carregarPerfilCompleto } from "@/features/curriculo/queries";
import { requirePapel } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { dataCurta } from "@/lib/format";

export const metadata: Metadata = { title: "Currículo" };

export default async function CurriculoPage() {
  const sessao = await requirePapel("estudante");
  const r = await carregarPerfilCompleto(sessao.userId);
  if (!r.ok) return <ErrorState />;
  if (!r.data) {
    return (
      <EmptyState title="Sua matrícula ainda não está vinculada a esta conta.">
        Procure a secretaria acadêmica para concluir o vínculo.
      </EmptyState>
    );
  }
  const p = r.data;
  const confirmadas = p.habilidades.filter((h) => h.status === "confirmada").length;
  const sugeridas = p.habilidades.filter((h) => h.status === "sugerida").length;
  const contatoOk = Boolean(p.perfil?.email_contato && p.perfil?.telefone);

  const passos = [
    { feito: Boolean(p.perfil?.objetivo || p.perfil?.area_interesse), titulo: "Objetivo profissional", href: "/curriculo/perfil?etapa=1" },
    { feito: contatoOk, titulo: "Contato (e-mail e telefone)", href: "/curriculo/perfil?etapa=2" },
    {
      feito: p.experiencias.length + p.projetos.length > 0,
      titulo: "Experiências, atividades ou projetos",
      href: "/curriculo/perfil?etapa=4",
    },
    {
      feito: confirmadas > 0 && sugeridas === 0,
      titulo: sugeridas ? `Competências: ${sugeridas} ${sugeridas === 1 ? "sugestão aguarda" : "sugestões aguardam"} confirmação` : "Competências confirmadas",
      href: "/curriculo/competencias",
    },
    { feito: Boolean(p.rascunho), titulo: "Currículo revisado", href: "/curriculo/editor" },
    { feito: p.versoes.length > 0, titulo: "PDF gerado", href: "/curriculo/editor#exportar" },
  ];
  const proximo = passos.find((x) => !x.feito);
  const ultima = p.versoes[0];
  const scan = ultima?.scan as { pontuacao?: number } | null;

  return (
    <>
      <PageHeader eyebrow={`${p.estudante.curso}, ${p.estudante.periodoAtual}º período`} title="Currículo" />
      <CurriculoAbas atual="/curriculo" />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel
          title="Seu progresso"
          description="Você conta o que já fez, confirma as competências e gera um currículo em PDF pronto para sistemas de recrutamento."
        >
          <ol className="flex flex-col divide-y divide-line">
            {passos.map((passo, i) => (
              <li key={passo.titulo} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      passo.feito ? "bg-ok text-white" : "bg-line text-muted",
                    )}
                  >
                    {passo.feito ? "✓" : i + 1}
                  </span>
                  <span className={passo.feito ? "text-body" : "font-semibold"}>
                    {passo.titulo}
                    <span className="sr-only">{passo.feito ? " (concluído)" : " (pendente)"}</span>
                  </span>
                </span>
                <Link href={passo.href} className="text-[13px] leading-5 font-semibold text-primary hover:text-primary-hover">
                  {passo.feito ? "Revisar" : "Fazer agora"}
                </Link>
              </li>
            ))}
          </ol>
          {proximo && (
            <ButtonLink href={proximo.href} className="mt-4">
              Continuar: {proximo.titulo.split(":")[0].toLowerCase()}
            </ButtonLink>
          )}
        </Panel>

        <Panel title="Última versão">
          {!ultima ? (
            <EmptyState title="Nenhum PDF gerado ainda." />
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-bold">{ultima.titulo}</div>
                <div className="text-[13px] leading-5 text-muted">
                  Gerada em {dataCurta(ultima.created_at)}
                  {ultima.vaga_alvo ? ` · adaptada para ${ultima.vaga_alvo}` : ""}
                </div>
              </div>
              {typeof scan?.pontuacao === "number" && (
                <div className="flex items-center gap-2">
                  <Badge tone={scan.pontuacao >= 80 ? "ok" : scan.pontuacao >= 60 ? "warn" : "danger"}>
                    Leitura por ATS: {scan.pontuacao}/100
                  </Badge>
                  <span className="text-xs leading-4 text-muted">estimativa do KairusEdu</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <DownloadLink href={`/curriculo/arquivo/versao/${ultima.id}`}>Baixar PDF</DownloadLink>
                <ButtonLink href="/curriculo/ats" variant="ghost">
                  Ver no scanner →
                </ButtonLink>
              </div>
            </div>
          )}
          <p className="mt-4 text-[13px] leading-5 text-muted">
            Seu currículo, seus contatos e suas análises de vaga são visíveis só para você. A instituição vê apenas totais
            agregados, sem identificação.
          </p>
        </Panel>
      </div>
    </>
  );
}
