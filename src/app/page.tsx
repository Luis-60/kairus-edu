import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

const PROBLEMAS = [
  {
    t: "Dados espalhados",
    d: "Notas, frequência, acessos ao ambiente virtual e situação financeira vivem em sistemas que não conversam.",
  },
  { t: "Sinais percebidos tarde", d: "Quando o pedido de trancamento chega, a decisão do aluno quase sempre já foi tomada." },
  { t: "Motivos sem registro", d: "Sem pesquisa de desligamento, cada saída deixa de ensinar algo à instituição." },
];

const ETAPAS = [
  { t: "Ingresso", d: "Dados de matrícula e perfil formam a primeira leitura de risco." },
  { t: "Jornada acadêmica", d: "Frequência, notas, entregas e acessos entram a cada semana." },
  { t: "Sinais", d: "Mudanças de comportamento viram alertas visíveis." },
  { t: "Inteligência", d: "O modelo estima a probabilidade e explica os fatores." },
  { t: "Intervenção", d: "A coordenação age e registra o que foi feito." },
  { t: "Permanência", d: "A instituição aprende com cada caso, inclusive as saídas." },
];

const RECURSOS = [
  { t: "Análise de dados", d: "Acadêmicos, financeiros e de engajamento em um só lugar." },
  { t: "Padrões", d: "Por curso, período, perfil e momento da jornada." },
  { t: "Score de risco", d: "Baixo risco, Atenção ou Alto risco." },
  { t: "Recomendações", d: "Ação sugerida para cada sinal." },
  { t: "Acompanhamento", d: "Cobertura das ações de permanência." },
  { t: "Privacidade", d: "Alunos aparecem por código e cada acesso fica registrado." },
];

const PERFIS = [
  {
    t: "Estudantes",
    d: "Acompanham a própria trajetória, veem frequência e rendimento e pedem apoio à coordenação.",
  },
  {
    t: "Coordenadores",
    d: "Veem a carteira de alunos priorizada por risco e registram ações preventivas com prazo e responsável.",
  },
  {
    t: "Gestão universitária",
    d: "Enxerga a evasão por curso, período e modalidade, entende os motivos e decide onde investir.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-surface">
      <header className="mx-auto flex max-w-316 flex-wrap items-center justify-between gap-4 px-6 py-6 md:px-8">
        <Logo fundo="claro" className="h-7" priority />
        <nav aria-label="Seções" className="hidden gap-8 font-semibold md:flex">
          <a href="#problema" className="hover:text-primary">O problema</a>
          <a href="#como" className="hover:text-primary">Como funciona</a>
          <a href="#inteligencia" className="hover:text-primary">Inteligência</a>
          <a href="#quem" className="hover:text-primary">Para quem</a>
        </nav>
        <ButtonLink href="/login" variant="secondary">
          Acessar plataforma
        </ButtonLink>
      </header>

      <main>
        <section className="mx-auto flex max-w-316 flex-col gap-6 px-6 pt-12 pb-20 md:px-8 md:pt-16 md:pb-24">
          <span className="label-caps self-start rounded-full bg-tint px-3 py-1.5 text-primary">Inteligência educacional</span>
          <h1 className="max-w-205 text-4xl leading-11 font-extrabold tracking-[-0.03em] md:text-5xl md:leading-14">
            Entenda por que seus alunos ficam. <span className="text-primary">E por que eles saem.</span>
          </h1>
          <p className="max-w-140 text-lg leading-7 text-body">
            Inteligência de dados para transformar sinais de evasão em ações de permanência.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="#como">Conheça a plataforma</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Acessar plataforma
            </ButtonLink>
          </div>
        </section>

        <section id="problema" className="bg-canvas px-6 py-20 md:px-8">
          <div className="mx-auto flex max-w-300 flex-col gap-10">
            <div>
              <span className="label-caps text-primary">O problema</span>
              <h2 className="mt-2 max-w-160 text-3xl leading-9 font-bold tracking-[-0.02em]">
                A universidade tem os dados. Falta transformá-los em ação a tempo.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {PROBLEMAS.map((p) => (
                <div key={p.t} className="rounded-card border border-line bg-surface p-6">
                  <h3 className="text-lg leading-7 font-bold">{p.t}</h3>
                  <p className="mt-2 text-body">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como" className="px-6 py-20 md:px-8">
          <div className="mx-auto flex max-w-300 flex-col gap-10">
            <div>
              <span className="label-caps text-primary">Como funciona</span>
              <h2 className="mt-2 max-w-160 text-3xl leading-9 font-bold tracking-[-0.02em]">
                Do ingresso à permanência, uma jornada acompanhada.
              </h2>
            </div>
            <ol className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {ETAPAS.map((e, i) => (
                <li key={e.t} className="flex flex-col gap-2 border-t-2 border-navy pt-4">
                  <span className="tabular text-[13px] font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-lg leading-7 font-bold">{e.t}</h3>
                  <p className="text-body">{e.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="inteligencia" className="bg-navy px-6 py-20 text-white md:px-8">
          <div className="mx-auto flex max-w-300 flex-col gap-10 lg:flex-row lg:gap-16">
            <div className="lg:w-2/5">
              <span className="label-caps text-sidebar-text">Inteligência de Permanência</span>
              <h2 className="mt-2 text-3xl leading-9 font-bold tracking-[-0.02em]">Machine learning traduzido para quem decide.</h2>
              <p className="mt-4 text-sidebar-text">
                O modelo estima a probabilidade de evasão de cada estudante e mostra os fatores que mais pesaram. Ele orienta
                a conversa. A decisão continua com a equipe.
              </p>
            </div>
            <ul className="grid flex-1 grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {RECURSOS.map((r) => (
                <li key={r.t} className="border-t border-white/15 pt-4">
                  <div className="font-bold">{r.t}</div>
                  <div className="text-[13px] leading-5 text-sidebar-text">{r.d}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="quem" className="px-6 py-20 md:px-8">
          <div className="mx-auto flex max-w-300 flex-col gap-10">
            <div>
              <span className="label-caps text-primary">Para quem</span>
              <h2 className="mt-2 text-3xl leading-9 font-bold tracking-[-0.02em]">Três experiências, uma só plataforma.</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {PERFIS.map((p) => (
                <div key={p.t} className="rounded-card border border-line p-6">
                  <h3 className="text-lg leading-7 font-bold">{p.t}</h3>
                  <p className="mt-2 text-body">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-canvas px-6 py-16 md:px-8">
          <div className="mx-auto flex max-w-300 flex-wrap items-center justify-between gap-6">
            <h2 className="max-w-160 text-2xl leading-8 font-bold tracking-[-0.02em]">
              Transforme dados acadêmicos em decisões que aumentam a permanência.
            </h2>
            <ButtonLink href="/login">Acessar plataforma</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-316 flex-wrap items-center justify-between gap-4 px-6 py-8 text-[13px] leading-5 text-muted md:px-8">
        <Logo fundo="claro" />
        <span>Acesso restrito a instituições parceiras.</span>
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Entrar
        </Link>
      </footer>
    </div>
  );
}
