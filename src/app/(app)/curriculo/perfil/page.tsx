import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CurriculoAbas } from "@/features/curriculo/abas";
import { periodo } from "@/features/curriculo/datas";
import {
  AnalisarButton,
  CertificacaoForm,
  ExcluirBotao,
  ExperienciaSheet,
  HabilidadeForm,
  IdiomaForm,
  PerfilForm,
  ProjetoSheet,
  type Roteiro,
} from "@/features/curriculo/forms";
import { carregarPerfilCompleto, type PerfilCompleto } from "@/features/curriculo/queries";
import { requirePapel } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Perfil profissional" };

const ETAPAS = ["Objetivo", "Contato", "Formação", "Experiências", "Vivências e projetos", "Competências", "Revisão"];

/** Perguntas que revelam competências ocultas (seção 4.2, etapa 4 da especificação). */
const ROTEIROS: (Roteiro & { pergunta: string; competencias: string })[] = [
  {
    pergunta: "Você já coordenou um grupo de pessoas?",
    competencias: "Liderança, coordenação de equipes, comunicação, planejamento",
    titulo: "Coordenação de um grupo",
    tipo: "atividade",
    rotuloCargo: "Qual era o seu papel?",
    cargoSugerido: "Coordenação de grupo",
    rotuloAtividades: "Quantas pessoas, qual era o objetivo e como você organizou o trabalho?",
    dicaAtividades: "Ex.: coordenei 5 colegas no projeto integrador, dividindo tarefas e marcando reuniões semanais.",
    rotuloResultados: "Qual foi o resultado?",
  },
  {
    pergunta: "Você já organizou um evento ou atividade?",
    competencias: "Organização de eventos, logística, orçamento, gestão do tempo",
    titulo: "Organização de evento",
    tipo: "atividade",
    rotuloCargo: "Qual era o evento ou atividade?",
    cargoSugerido: "Organização de evento",
    rotuloAtividades: "O que você fez na organização?",
    dicaAtividades: "Ex.: reservas, divulgação, controle de inscrições, contato com fornecedores, orçamento.",
    rotuloResultados: "Como foi? Quantas pessoas participaram? (se souber)",
  },
  {
    pergunta: "Você já ajudou alguém a resolver um problema técnico?",
    competencias: "Suporte técnico, resolução de problemas, atendimento, pensamento analítico",
    titulo: "Ajuda técnica",
    tipo: "informal",
    rotuloCargo: "Que tipo de ajuda?",
    cargoSugerido: "Suporte técnico informal",
    rotuloAtividades: "Que problemas você resolveu e como?",
    dicaAtividades: "Ex.: formatei computadores de vizinhos, configurei redes, ajudei parentes com celular e aplicativos.",
    rotuloResultados: "Resultado (opcional)",
  },
  {
    pergunta: "Você já fez trabalho voluntário?",
    competencias: "Trabalho em equipe, empatia, comunicação, responsabilidade",
    titulo: "Voluntariado",
    tipo: "voluntario",
    rotuloCargo: "Qual era o seu papel?",
    rotuloAtividades: "O que você fazia?",
    dicaAtividades: "Ex.: organizava doações, dava aulas de reforço, cuidava das redes sociais da instituição.",
    rotuloResultados: "Resultado (opcional)",
  },
  {
    pergunta: "Você já cuidou de dinheiro, estoque ou contas de um grupo ou negócio?",
    competencias: "Controle financeiro, controle de estoque, organização",
    titulo: "Gestão de recursos",
    tipo: "negocio_familiar",
    rotuloCargo: "Qual era a sua responsabilidade?",
    rotuloAtividades: "O que você controlava e como?",
    dicaAtividades: "Ex.: controlava o caixa da atlética numa planilha; fazia pedidos de estoque do mercado da família.",
    rotuloResultados: "Resultado (opcional)",
  },
];

const TIPO_LABEL: Record<string, string> = {
  formal: "Emprego",
  estagio: "Estágio",
  freelance: "Autônomo",
  negocio_familiar: "Negócio da família",
  informal: "Informal",
  voluntario: "Voluntariado",
  atividade: "Atividade",
};

export default async function PerfilPage({ searchParams }: PageProps<"/curriculo/perfil">) {
  const sessao = await requirePapel("estudante");
  const params = await searchParams;
  const r = await carregarPerfilCompleto(sessao.userId);
  if (!r.ok) return <ErrorState />;
  if (!r.data) return <EmptyState title="Sua matrícula ainda não está vinculada a esta conta." />;
  const p = r.data;

  const pedida = Number(Array.isArray(params.etapa) ? params.etapa[0] : params.etapa);
  const etapa = Number.isInteger(pedida) && pedida >= 1 && pedida <= ETAPAS.length ? pedida : Math.min(p.perfil?.etapa_atual ?? 1, ETAPAS.length);
  const href = (n: number) => `/curriculo/perfil?etapa=${n}`;
  const perfil = (p.perfil ?? {}) as Partial<NonNullable<PerfilCompleto["perfil"]>>;
  // Só os campos de texto editáveis vão para os formulários.
  const valores = {
    tipo_vaga: perfil.tipo_vaga,
    area_interesse: perfil.area_interesse,
    objetivo: perfil.objetivo,
    email_contato: perfil.email_contato,
    telefone: perfil.telefone,
    cidade: perfil.cidade,
    linkedin: perfil.linkedin,
    portfolio: perfil.portfolio,
    disciplinas_relevantes: perfil.disciplinas_relevantes,
    conquistas_academicas: perfil.conquistas_academicas,
  };

  return (
    <>
      <PageHeader eyebrow="Currículo" title="Perfil profissional" />
      <CurriculoAbas atual="/curriculo/perfil" />

      <nav aria-label="Etapas do perfil" className="overflow-x-auto">
        <ol className="flex min-w-max gap-1.5">
          {ETAPAS.map((nome, i) => (
            <li key={nome}>
              <Link
                href={href(i + 1)}
                aria-current={etapa === i + 1 ? "step" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-control px-3 text-[13px] leading-5 font-semibold",
                  etapa === i + 1 ? "bg-navy text-white" : i + 1 < etapa ? "bg-tint text-primary" : "bg-canvas text-muted hover:text-primary",
                )}
              >
                <span className="tabular">{i + 1}</span> {nome}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <Panel className="max-w-4xl">
        {etapa === 1 && (
          <Etapa titulo="Qual é o seu objetivo?" descricao="Isso orienta o resumo do currículo e a análise de vagas.">
            <PerfilForm
              etapa={1}
              proxima={href(2)}
              valores={valores}
              campos={[
                {
                  nome: "tipo_vaga",
                  rotulo: "Que tipo de oportunidade você procura?",
                  tipo: "select",
                  opcoes: [
                    { valor: "estagio", rotulo: "Estágio" },
                    { valor: "emprego", rotulo: "Emprego" },
                    { valor: "trainee", rotulo: "Trainee" },
                    { valor: "aprendiz", rotulo: "Jovem aprendiz" },
                  ],
                },
                { nome: "area_interesse", rotulo: "Qual área profissional interessa você?", max: 120, placeholder: "Ex.: Qualidade, logística, desenvolvimento web" },
                { nome: "objetivo", rotulo: "Quais são seus objetivos profissionais?", tipo: "area", max: 600, dica: "Uma ou duas frases, com suas palavras." },
              ]}
            />
          </Etapa>
        )}

        {etapa === 2 && (
          <Etapa titulo="Como os recrutadores falam com você?" descricao="Esses dados aparecem só no seu currículo. A instituição não tem acesso a eles por aqui.">
            <PerfilForm
              etapa={2}
              proxima={href(3)}
              anterior={href(1)}
              valores={valores}
              campos={[
                { nome: "email_contato", rotulo: "E-mail", tipo: "email", max: 254, dica: "Prefira um e-mail com seu nome, que você confira sempre." },
                { nome: "telefone", rotulo: "Telefone com DDD", tipo: "tel", max: 30, placeholder: "(24) 99999-0000" },
                { nome: "cidade", rotulo: "Cidade e estado", max: 80, placeholder: "Volta Redonda, RJ" },
                { nome: "linkedin", rotulo: "LinkedIn (opcional)", max: 200, placeholder: "linkedin.com/in/seu-nome" },
                { nome: "portfolio", rotulo: "Portfólio ou GitHub (opcional)", tipo: "url", max: 200, placeholder: "https://" },
              ]}
            />
          </Etapa>
        )}

        {etapa === 3 && (
          <Etapa titulo="Formação" descricao="Os dados do curso vêm do sistema acadêmico e já estão verificados.">
            <dl className="mb-6 grid grid-cols-2 gap-4 rounded-card bg-canvas p-4 md:grid-cols-4">
              <Dado rotulo="Curso" valor={p.estudante.curso} />
              <Dado rotulo="Instituição" valor={p.estudante.instituicao} />
              <Dado rotulo="Período" valor={`${p.estudante.periodoAtual}º de ${p.estudante.totalPeriodos}`} />
              <Dado rotulo="Previsão de conclusão" valor={p.estudante.previsaoConclusao ?? "—"} />
            </dl>
            <PerfilForm
              etapa={3}
              proxima={href(4)}
              anterior={href(2)}
              valores={valores}
              campos={[
                { nome: "disciplinas_relevantes", rotulo: "Disciplinas relevantes para o seu objetivo (opcional)", tipo: "area", max: 600, placeholder: "Ex.: Estatística, Gestão da Qualidade, Banco de Dados" },
                { nome: "conquistas_academicas", rotulo: "Conquistas, pesquisa, monitoria ou extensão (opcional)", tipo: "area", max: 800, dica: "Uma por linha. Ex.: monitor de Cálculo I em 2026.1." },
              ]}
            />
          </Etapa>
        )}

        {etapa === 4 && (
          <Etapa
            titulo="Você já trabalhou, mesmo que informalmente?"
            descricao="Vale emprego, estágio, trabalho autônomo, negócio da família, bico ou voluntariado. Não se preocupe com o nome do cargo; conte o que você fazia."
          >
            <ListaExperiencias itens={p.experiencias.filter((e) => !["atividade", "voluntario"].includes(e.tipo))} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ExperienciaSheet rotuloBotao="Adicionar experiência" variante="primary" />
              {p.experiencias.length === 0 && (
                <span className="text-[13px] leading-5 text-muted">
                  Nunca trabalhou? Tudo bem: siga para a próxima etapa, em que suas vivências e projetos contam muito.
                </span>
              )}
            </div>
            <Navegacao anterior={href(3)} proxima={href(5)} />
          </Etapa>
        )}

        {etapa === 5 && (
          <Etapa titulo="Vivências e projetos" descricao="Muitas competências aparecem fora do trabalho. Responda às perguntas que fizerem sentido para você.">
            <ul className="flex flex-col divide-y divide-line">
              {ROTEIROS.map((roteiro) => (
                <li key={roteiro.pergunta} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <div className="font-semibold">{roteiro.pergunta}</div>
                    <div className="text-[13px] leading-5 text-muted">Pode revelar: {roteiro.competencias}</div>
                  </div>
                  <ExperienciaSheet rotuloBotao="Sim, contar" roteiro={roteiro} />
                </li>
              ))}
              <li className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold">Você desenvolveu um projeto acadêmico ou pessoal?</div>
                  <div className="text-[13px] leading-5 text-muted">Pode revelar: resolução de problemas, gestão de projetos, conhecimento técnico, pesquisa</div>
                </div>
                <ProjetoSheet rotuloBotao="Sim, contar" />
              </li>
            </ul>

            {(p.experiencias.some((e) => ["atividade", "voluntario"].includes(e.tipo)) || p.projetos.length > 0) && (
              <div className="mt-6">
                <h3 className="label-caps mb-2 text-muted">O que você já contou</h3>
                <ListaExperiencias itens={p.experiencias.filter((e) => ["atividade", "voluntario"].includes(e.tipo))} />
                <ul className="flex flex-col divide-y divide-line">
                  {p.projetos.map((pr) => (
                    <li key={pr.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {pr.titulo} <Badge>Projeto</Badge>
                        </div>
                        <p className="line-clamp-2 text-[13px] leading-5 text-body">{pr.acoes}</p>
                      </div>
                      <div className="flex gap-1">
                        <ProjetoSheet rotuloBotao="Editar" projeto={pr} variante="ghost" />
                        <ExcluirBotao tabela="projetos" id={pr.id} rotulo={pr.titulo} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Navegacao anterior={href(4)} proxima={href(6)} />
          </Etapa>
        )}

        {etapa === 6 && (
          <Etapa
            titulo="Competências, idiomas e certificações"
            descricao="Inclua o que você sabe de verdade. Nada é adicionado automaticamente só por causa do seu curso."
          >
            <div className="flex flex-col gap-6">
              <section>
                <h3 className="mb-2 font-bold">Competências técnicas e comportamentais</h3>
                <HabilidadeForm />
                <ListaChips itens={p.habilidades.filter((h) => h.status === "confirmada").map((h) => ({ id: h.id, texto: h.nome }))} tabela="habilidades" />
              </section>
              <section>
                <h3 className="mb-2 font-bold">Idiomas</h3>
                <IdiomaForm />
                <ListaChips itens={p.idiomas.map((i) => ({ id: i.id, texto: `${i.idioma} (${i.nivel})` }))} tabela="idiomas" />
              </section>
              <section>
                <h3 className="mb-2 font-bold">Cursos e certificações</h3>
                <CertificacaoForm />
                <ListaChips itens={p.certificacoes.map((c) => ({ id: c.id, texto: c.nome }))} tabela="certificacoes" />
              </section>
            </div>
            <Navegacao anterior={href(5)} proxima={href(7)} />
          </Etapa>
        )}

        {etapa === 7 && (
          <Etapa titulo="Revisão" descricao="Agora a IA lê suas experiências e projetos e sugere competências, sempre com a evidência de onde tirou cada uma.">
            <dl className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Dado rotulo="Experiências e atividades" valor={String(p.experiencias.length)} />
              <Dado rotulo="Projetos" valor={String(p.projetos.length)} />
              <Dado rotulo="Competências confirmadas" valor={String(p.habilidades.filter((h) => h.status === "confirmada").length)} />
              <Dado rotulo="Contato" valor={perfil.email_contato && perfil.telefone ? "Completo" : "Incompleto"} />
            </dl>
            <AnalisarButton />
            <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-4">
              <ButtonLink href={href(6)} variant="secondary">
                Voltar
              </ButtonLink>
              <ButtonLink href="/curriculo/competencias" variant="ghost">
                Ir para competências sem analisar
              </ButtonLink>
            </div>
          </Etapa>
        )}
      </Panel>
    </>
  );
}

function Etapa({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg leading-7 font-bold">{titulo}</h2>
        <p className="text-[13px] leading-5 text-muted">{descricao}</p>
      </div>
      {children}
    </div>
  );
}

function Navegacao({ anterior, proxima }: { anterior: string; proxima: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-4">
      <ButtonLink href={anterior} variant="secondary">
        Voltar
      </ButtonLink>
      <ButtonLink href={proxima}>Continuar</ButtonLink>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-muted">{rotulo}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}

function ListaExperiencias({ itens }: { itens: PerfilCompleto["experiencias"] }) {
  if (itens.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {itens.map((e) => (
        <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="font-semibold">
              {e.cargo} <Badge>{TIPO_LABEL[e.tipo]}</Badge>
            </div>
            <div className="text-[13px] leading-5 text-muted">
              {[e.organizacao, periodo(e.inicio, e.fim, e.atual) || "sem período informado"].filter(Boolean).join(" · ")}
            </div>
            <p className="line-clamp-2 text-[13px] leading-5 text-body">{e.atividades}</p>
          </div>
          <div className="flex gap-1">
            <ExperienciaSheet rotuloBotao="Editar" experiencia={e} variante="ghost" />
            <ExcluirBotao tabela="experiencias" id={e.id} rotulo={e.cargo} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListaChips({ itens, tabela }: { itens: { id: string; texto: string }[]; tabela: "habilidades" | "idiomas" | "certificacoes" }) {
  if (itens.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {itens.map((i) => (
        <li key={i.id} className="inline-flex items-center gap-1 rounded-control border border-line bg-canvas pl-3">
          <span className="text-[13px] leading-5 font-semibold">{i.texto}</span>
          <ExcluirBotao tabela={tabela} id={i.id} rotulo={i.texto} />
        </li>
      ))}
    </ul>
  );
}
