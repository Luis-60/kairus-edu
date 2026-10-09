import type { Metadata } from "next";
import Link from "next/link";
import { Badge, type Tone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CandidatarButton } from "@/features/carreira/candidatar-button";
import { carregarCarreira, type SituacaoCompetencia } from "@/features/carreira/queries";
import { requirePapel } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Carreira e estágio" };

const SITUACAO: Record<SituacaoCompetencia, { label: string; tone: Tone }> = {
  tem: { label: "Você já tem", tone: "ok" },
  desenvolvendo: { label: "Em desenvolvimento", tone: "warn" },
  falta: { label: "A desenvolver", tone: "info" },
};

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CarreiraPage({ searchParams }: PageProps<"/carreira">) {
  const sessao = await requirePapel("estudante");
  const params = await searchParams;
  const carreira = await carregarCarreira(sessao.userId);

  if (!carreira.ok) {
    return (
      <>
        <PageHeader title="Carreira e estágio" />
        <ErrorState />
      </>
    );
  }
  if (!carreira.data) {
    return (
      <>
        <PageHeader title="Carreira e estágio" />
        <EmptyState title="Sua matrícula ainda não está vinculada a esta conta.">
          Procure a secretaria acadêmica para concluir o vínculo.
        </EmptyState>
      </>
    );
  }

  const c = carreira.data;
  const vagaSel = c.vagas.find((v) => v.id === primeiro(params.vaga)) ?? c.vagas[0];
  const areaSel = c.areas.find((a) => a.id === primeiro(params.area)) ?? c.areas[0];
  const concluidas = c.etapas.filter((e) => e.periodo < c.periodoAtual).length;
  const href = (mudancas: Record<string, string>) => {
    const p = new URLSearchParams();
    if (vagaSel) p.set("vaga", vagaSel.id);
    if (areaSel) p.set("area", areaSel.id);
    for (const [k, v] of Object.entries(mudancas)) p.set(k, v);
    return `/carreira?${p.toString()}`;
  };

  return (
    <>
      <PageHeader eyebrow={`${c.curso}, ${c.periodoAtual}º período`} title="Carreira e estágio" />

      {c.etapas.length > 0 && (
        <Panel
          title="Trilha de carreira até o estágio obrigatório"
          description={`Do 1º ao ${c.etapas[c.etapas.length - 1].periodo}º período, cada etapa prepara você para chegar pronto ao estágio.`}
          actions={<span className="font-bold">{`${concluidas} de ${c.etapas.length} etapas concluídas`}</span>}
        >
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {c.etapas.map((e) => {
              const status = e.periodo < c.periodoAtual ? "ok" : e.periodo === c.periodoAtual ? "agora" : "depois";
              return (
                <li
                  key={e.id}
                  aria-current={status === "agora" ? "step" : undefined}
                  className={cn(
                    "flex flex-col gap-2 rounded-card border p-4",
                    status === "agora" ? "border-primary bg-canvas" : "border-line",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] leading-5 font-bold text-muted">{e.periodo}º período</span>
                    {status === "ok" && <Badge tone="ok">Concluída</Badge>}
                    {status === "agora" && <Badge tone="strong">Em andamento</Badge>}
                    {status === "depois" && <Badge>A seguir</Badge>}
                  </div>
                  <div className="font-bold">{e.titulo}</div>
                  <div className="text-[13px] leading-5 text-body">{e.descricao}</div>
                  <div className="mt-auto text-[13px] leading-5 text-muted">
                    <span className="font-semibold text-navy">Entrega</span> {e.entrega}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}

      <Panel
        id="vagas"
        title="Vagas compatíveis com o que você estuda"
        description="A compatibilidade compara as competências da vaga com as que você já tem. Selecione uma vaga para ver os detalhes."
      >
        {c.vagas.length === 0 || !vagaSel ? (
          <EmptyState title="Nenhuma vaga aberta para o seu curso no momento." />
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_3fr]">
            <ul className="flex flex-col gap-3">
              {c.vagas.map((v) => {
                const ativa = v.id === vagaSel.id;
                return (
                  <li key={v.id}>
                    <Link
                      href={href({ vaga: v.id })}
                      scroll={false}
                      aria-current={ativa ? "true" : undefined}
                      className={cn(
                        "flex flex-col gap-1 rounded-card border p-4 hover:border-primary",
                        ativa ? "border-2 border-primary" : "border-line",
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-bold">{v.titulo}</span>
                        <span className="tabular font-extrabold text-primary">{v.compatibilidade}%</span>
                      </span>
                      <span className="text-[13px] leading-5 text-muted">
                        {v.empresa} · {v.cidade}
                      </span>
                      <span className="text-[13px] leading-5 text-body">
                        A partir do {v.periodoMinimo}º período, {v.cargaHoraria}
                      </span>
                      {v.candidatada && (
                        <span className="mt-1">
                          <Badge tone="ok">Candidatura enviada</Badge>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col gap-5 rounded-card border border-line p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg leading-7 font-bold">{vagaSel.titulo}</h3>
                  <div className="text-[13px] leading-5 text-muted">
                    {vagaSel.empresa} · {vagaSel.cidade}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular text-[32px] leading-10 font-extrabold text-primary">{vagaSel.compatibilidade}%</div>
                  <div className="text-[13px] leading-5 text-muted">de compatibilidade</div>
                </div>
              </div>
              <div>
                <h4 className="label-caps mb-1 text-muted">Descrição da vaga</h4>
                <p className="text-body">{vagaSel.descricao}</p>
              </div>
              <div>
                <h4 className="label-caps mb-2 text-muted">Competências da vaga</h4>
                <ul className="flex flex-col gap-2">
                  {vagaSel.competencias.map((comp) => (
                    <li key={comp.nome} className="flex items-center justify-between gap-3 rounded-control bg-canvas px-3 py-2">
                      <span className="font-semibold">{comp.nome}</span>
                      <Badge tone={SITUACAO[comp.situacao].tone}>{SITUACAO[comp.situacao].label}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {vagaSel.candidatada ? (
                  <Badge tone="ok">Candidatura enviada</Badge>
                ) : (
                  <CandidatarButton key={vagaSel.id} vagaId={vagaSel.id} bloqueada={c.periodoAtual < vagaSel.periodoMinimo} />
                )}
                <span className="text-[13px] leading-5 text-muted">{vagaSel.dica}</span>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {areaSel && (
        <Panel
          id="areas"
          title="Trilhas de aprendizado por área"
          description={`As principais áreas de atuação de ${c.curso} e o que estudar em cada uma.`}
        >
          <nav aria-label="Área de atuação" className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-card border border-line bg-canvas p-1">
            {c.areas.map((a) => (
              <Link
                key={a.id}
                href={href({ area: a.id })}
                scroll={false}
                aria-current={a.id === areaSel.id ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-control px-4 text-[13px] leading-5 font-semibold whitespace-nowrap",
                  a.id === areaSel.id ? "bg-surface text-primary shadow-card" : "text-muted hover:text-primary",
                )}
              >
                {a.nome}
              </Link>
            ))}
          </nav>
          <p className="mb-4 text-body">{areaSel.descricao}</p>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {areaSel.area_passos.map((p) => (
              <li key={p.ordem} className="flex flex-col gap-1 rounded-card bg-canvas p-4">
                <span className="label-caps text-primary">Passo {p.ordem}</span>
                <span className="font-bold">{p.titulo}</span>
                <span className="text-[13px] leading-5 text-body">{p.descricao}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {c.empresas.length > 0 && (
        <Panel id="empresas" title="Empresas do seu ramo perto do campus" description="Distância aproximada a partir do campus.">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {c.empresas.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 rounded-card border border-line p-4">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-bold">{e.nome}</span>
                  {e.distancia_campus_km != null && (
                    <span className="tabular text-[13px] leading-5 font-bold text-primary whitespace-nowrap">
                      {e.distancia_campus_km} km
                    </span>
                  )}
                </span>
                <span className="text-[13px] leading-5 text-muted">
                  {e.setor} · {e.cidade}
                </span>
                <span className="text-[13px] leading-5 text-body">{e.areas}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel id="curriculo" flat>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 max-w-160">
            <h2 className="text-lg leading-7 font-bold">Monte seu currículo com IA</h2>
            <p className="text-[13px] leading-5 text-muted">
              Conte o que você já fez, em trabalho, família, voluntariado ou projetos. A IA ajuda a reconhecer competências
              e você confirma o que entra no currículo.
            </p>
          </div>
          <ButtonLink href="/curriculo/perfil">Montar meu currículo</ButtonLink>
        </div>
      </Panel>

      <Panel id="futuro" flat>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
          <div className="min-w-0 lg:w-1/3">
            <div className="label-caps text-muted">
              {c.periodoAtual >= 8 ? "Disponível para você" : "A partir do 8º período"}
            </div>
            <h2 className="text-lg leading-7 font-bold">Trainee e pós-graduação</h2>
            <p className="text-[13px] leading-5 text-muted">
              {c.periodoAtual >= 8
                ? "Fale com a coordenação para conhecer os programas e editais abertos."
                : "Esta área é liberada quando você chegar ao 8º período. Até lá, você já pode ver o que vem pela frente."}
            </p>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-card bg-canvas p-4">
              <div className="font-bold">Programas de trainee</div>
              <p className="text-[13px] leading-5 text-body">
                Calendário de inscrições, etapas de seleção e programas em indústria, logística e consultoria.
              </p>
            </div>
            <div className="rounded-card bg-canvas p-4">
              <div className="font-bold">Pós-graduação</div>
              <p className="text-[13px] leading-5 text-body">
                Especializações e MBA por área, além de mestrado acadêmico e profissional, com editais e prazos.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}
