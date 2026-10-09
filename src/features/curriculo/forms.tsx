"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { analisarCompetencias, type IaResultado } from "./ia-actions";
import {
  adicionarHabilidade,
  excluirItem,
  salvarCertificacao,
  salvarExperiencia,
  salvarIdioma,
  salvarPerfil,
  salvarProjeto,
  type FormResultado,
} from "./perfil-actions";

const inicial: FormResultado = { status: "idle" };

/**
 * Envia o formulário pela action sem o reset automático do React 19: se o servidor recusar
 * um campo, o estudante não perde o que já digitou nos outros.
 */
function enviarSemLimpar(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

type Campo = {
  nome: string;
  rotulo: string;
  tipo?: "texto" | "area" | "email" | "tel" | "url" | "select";
  opcoes?: { valor: string; rotulo: string }[];
  dica?: string;
  max?: number;
  placeholder?: string;
};

/** Formulário de um grupo de campos do perfil; ao salvar, segue para a próxima etapa. */
export function PerfilForm({
  campos,
  valores,
  etapa,
  proxima,
  anterior,
}: {
  campos: Campo[];
  valores: Record<string, string | null | undefined>;
  etapa: number;
  proxima: string;
  anterior?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(salvarPerfil, inicial);
  const destino = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === "success" && destino.current) router.push(destino.current);
  }, [state, router]);

  return (
    <form action={action} onSubmit={enviarSemLimpar(action)} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="etapa_atual" value={etapa} />
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      {campos.map((c) => {
        const id = `perfil-${c.nome}`;
        const erro = state.fieldErrors?.[c.nome];
        const comum = {
          id,
          name: c.nome,
          defaultValue: valores[c.nome] ?? "",
          "aria-invalid": Boolean(erro),
          "aria-describedby": erro ? `${id}-error` : c.dica ? `${id}-hint` : undefined,
          placeholder: c.placeholder,
          maxLength: c.max,
        };
        return (
          <Field key={c.nome} id={id} label={c.rotulo} error={erro} hint={c.dica}>
            {c.tipo === "area" ? (
              <Textarea rows={4} {...comum} />
            ) : c.tipo === "select" ? (
              <Select {...comum}>
                <option value="">Selecione</option>
                {c.opcoes?.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </Select>
            ) : (
              <Input type={c.tipo === "email" ? "email" : c.tipo === "tel" ? "tel" : c.tipo === "url" ? "url" : "text"} {...comum} />
            )}
          </Field>
        );
      })}
      <div className="flex flex-wrap gap-3">
        {anterior && (
          <Button variant="secondary" onClick={() => router.push(anterior)} disabled={pending}>
            Voltar
          </Button>
        )}
        <Button type="submit" pending={pending} onClick={() => (destino.current = proxima)}>
          {pending ? "Salvando…" : "Salvar e continuar"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Experiências e atividades
// ---------------------------------------------------------------------------
export type Experiencia = {
  id: string;
  tipo: string;
  cargo: string;
  organizacao: string | null;
  inicio: string | null;
  fim: string | null;
  atual: boolean;
  atividades: string;
  ferramentas: string | null;
  resultados: string | null;
};

export type Roteiro = {
  titulo: string;
  tipo: string;
  cargoSugerido?: string;
  rotuloCargo: string;
  rotuloAtividades: string;
  dicaAtividades: string;
  rotuloResultados: string;
};

export const ROTEIRO_PADRAO: Roteiro = {
  titulo: "Experiência",
  tipo: "formal",
  rotuloCargo: "Cargo ou papel",
  rotuloAtividades: "O que você fazia?",
  dicaAtividades: "Uma atividade por linha. Inclua problemas que você resolveu e se cuidava de pessoas ou recursos.",
  rotuloResultados: "Resultados alcançados (opcional)",
};

const TIPOS = [
  { valor: "formal", rotulo: "Emprego formal" },
  { valor: "estagio", rotulo: "Estágio" },
  { valor: "freelance", rotulo: "Trabalho autônomo ou freelance" },
  { valor: "negocio_familiar", rotulo: "Negócio da família" },
  { valor: "informal", rotulo: "Trabalho informal" },
  { valor: "voluntario", rotulo: "Voluntariado" },
  { valor: "atividade", rotulo: "Atividade acadêmica ou comunitária" },
];

const mes = (d: string | null) => (d ? d.slice(0, 7) : "");

export function ExperienciaSheet({
  rotuloBotao,
  roteiro = ROTEIRO_PADRAO,
  experiencia,
  variante = "secondary",
}: {
  rotuloBotao: string;
  roteiro?: Roteiro;
  experiencia?: Experiencia;
  variante?: "primary" | "secondary" | "ghost";
}) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(salvarExperiencia, inicial);
  const [atual, setAtual] = useState(experiencia?.atual ?? false);
  const [visto, setVisto] = useState(state);

  if (state !== visto) {
    setVisto(state);
    if (state.status === "success") setAberto(false);
  }

  const erro = (c: string) => state.fieldErrors?.[c];
  return (
    <>
      <Button variant={variante} size={variante === "ghost" ? "sm" : "md"} onClick={() => setAberto(true)}>
        {rotuloBotao}
      </Button>
      <Sheet open={aberto} onOpenChange={setAberto} title={experiencia ? "Editar" : roteiro.titulo}>
        <form action={action} onSubmit={enviarSemLimpar(action)} noValidate className="flex flex-col gap-4">
          {experiencia && <input type="hidden" name="id" value={experiencia.id} />}
          {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
          <Field id="exp-tipo" label="Tipo" error={erro("tipo")}>
            <Select id="exp-tipo" name="tipo" defaultValue={experiencia?.tipo ?? roteiro.tipo}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="exp-cargo" label={roteiro.rotuloCargo} error={erro("cargo")}>
            <Input id="exp-cargo" name="cargo" maxLength={120} defaultValue={experiencia?.cargo ?? roteiro.cargoSugerido ?? ""} aria-invalid={Boolean(erro("cargo"))} />
          </Field>
          <Field id="exp-org" label="Onde (empresa, organização ou grupo)" error={erro("organizacao")}>
            <Input id="exp-org" name="organizacao" maxLength={160} defaultValue={experiencia?.organizacao ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="exp-inicio" label="Início (mês e ano)" error={erro("inicio")}>
              <Input id="exp-inicio" name="inicio" type="month" defaultValue={mes(experiencia?.inicio ?? null)} />
            </Field>
            <Field id="exp-fim" label="Fim" error={erro("fim")}>
              <Input id="exp-fim" name="fim" type="month" disabled={atual} defaultValue={mes(experiencia?.fim ?? null)} />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-[13px] leading-5 font-semibold">
            <input type="checkbox" name="atual" className="size-4 accent-primary" checked={atual} onChange={(e) => setAtual(e.target.checked)} />
            Ainda faço isso
          </label>
          <Field id="exp-atividades" label={roteiro.rotuloAtividades} hint={roteiro.dicaAtividades} error={erro("atividades")}>
            <Textarea id="exp-atividades" name="atividades" rows={5} maxLength={2000} defaultValue={experiencia?.atividades ?? ""} aria-invalid={Boolean(erro("atividades"))} />
          </Field>
          <Field id="exp-ferramentas" label="Ferramentas usadas (opcional)" hint="Ex.: Excel, sistema de caixa, WhatsApp Business, Python.">
            <Input id="exp-ferramentas" name="ferramentas" maxLength={400} defaultValue={experiencia?.ferramentas ?? ""} />
          </Field>
          <Field id="exp-resultados" label={roteiro.rotuloResultados} hint="Só o que realmente aconteceu. Números apenas se você tiver certeza.">
            <Textarea id="exp-resultados" name="resultados" rows={3} maxLength={800} defaultValue={experiencia?.resultados ?? ""} />
          </Field>
          <Button type="submit" pending={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------
export type Projeto = {
  id: string;
  titulo: string;
  problema: string | null;
  acoes: string;
  ferramentas: string | null;
  resultado: string | null;
  inicio: string | null;
  fim: string | null;
  link: string | null;
};

export function ProjetoSheet({ rotuloBotao, projeto, variante = "secondary" }: { rotuloBotao: string; projeto?: Projeto; variante?: "primary" | "secondary" | "ghost" }) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(salvarProjeto, inicial);
  const [visto, setVisto] = useState(state);
  if (state !== visto) {
    setVisto(state);
    if (state.status === "success") setAberto(false);
  }
  const erro = (c: string) => state.fieldErrors?.[c];
  return (
    <>
      <Button variant={variante} size={variante === "ghost" ? "sm" : "md"} onClick={() => setAberto(true)}>
        {rotuloBotao}
      </Button>
      <Sheet open={aberto} onOpenChange={setAberto} title={projeto ? "Editar projeto" : "Projeto"}>
        <form action={action} onSubmit={enviarSemLimpar(action)} noValidate className="flex flex-col gap-4">
          {projeto && <input type="hidden" name="id" value={projeto.id} />}
          {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
          <Field id="proj-titulo" label="Nome do projeto" error={erro("titulo")}>
            <Input id="proj-titulo" name="titulo" maxLength={160} defaultValue={projeto?.titulo ?? ""} />
          </Field>
          <Field id="proj-problema" label="Qual era o problema? (opcional)">
            <Textarea id="proj-problema" name="problema" rows={2} maxLength={800} defaultValue={projeto?.problema ?? ""} />
          </Field>
          <Field id="proj-acoes" label="O que você fez?" hint="Seu papel, não só o do grupo." error={erro("acoes")}>
            <Textarea id="proj-acoes" name="acoes" rows={4} maxLength={1500} defaultValue={projeto?.acoes ?? ""} />
          </Field>
          <Field id="proj-ferramentas" label="Ferramentas ou métodos (opcional)">
            <Input id="proj-ferramentas" name="ferramentas" maxLength={400} defaultValue={projeto?.ferramentas ?? ""} />
          </Field>
          <Field id="proj-resultado" label="Qual foi o resultado? Dá para medir? (opcional)" hint="Números só se forem verdadeiros.">
            <Textarea id="proj-resultado" name="resultado" rows={2} maxLength={800} defaultValue={projeto?.resultado ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="proj-inicio" label="Início (opcional)" error={erro("inicio")}>
              <Input id="proj-inicio" name="inicio" type="month" defaultValue={mes(projeto?.inicio ?? null)} />
            </Field>
            <Field id="proj-fim" label="Fim (opcional)" error={erro("fim")}>
              <Input id="proj-fim" name="fim" type="month" defaultValue={mes(projeto?.fim ?? null)} />
            </Field>
          </div>
          <Field id="proj-link" label="Link (opcional)" error={erro("link")}>
            <Input id="proj-link" name="link" type="url" maxLength={300} placeholder="https://" defaultValue={projeto?.link ?? ""} />
          </Field>
          <Button type="submit" pending={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Excluir item (com confirmação no próprio botão)
// ---------------------------------------------------------------------------
export function ExcluirBotao({ tabela, id, rotulo }: { tabela: Parameters<typeof excluirItem>[0]; id: string; rotulo: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendente, start] = useTransition();
  if (!confirmar) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirmar(true)} aria-label={`Excluir ${rotulo}`}>
        Excluir
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Button
        variant="secondary"
        size="sm"
        pending={pendente}
        onClick={() => start(async () => void (await excluirItem(tabela, id)))}
        aria-label={`Confirmar exclusão de ${rotulo}`}
      >
        Confirmar
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirmar(false)}>
        Cancelar
      </Button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formulários curtos: competência, idioma, certificação
// ---------------------------------------------------------------------------
function FormCurto({
  acao,
  children,
  rotulo,
}: {
  acao: (prev: FormResultado, fd: FormData) => Promise<FormResultado>;
  children: (erro: (c: string) => string | undefined) => React.ReactNode;
  rotulo: string;
}) {
  const [state, action, pending] = useActionState(acao, inicial);
  // Após salvar, a troca de key remonta o formulário e limpa os campos.
  const [chave, setChave] = useState(0);
  const [visto, setVisto] = useState(state);
  if (state !== visto) {
    setVisto(state);
    if (state.status === "success") setChave((k) => k + 1);
  }
  return (
    <form key={chave} action={action} onSubmit={enviarSemLimpar(action)} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {children((c) => state.fieldErrors?.[c])}
        <Button type="submit" variant="secondary" pending={pending}>
          {rotulo}
        </Button>
      </div>
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "success" && state.message && <FormMessage tone="success">{state.message}</FormMessage>}
    </form>
  );
}

export function HabilidadeForm() {
  return (
    <FormCurto acao={adicionarHabilidade} rotulo="Incluir">
      {(erro) => (
        <>
          <div className="min-w-48 flex-1">
            <Field id="hab-nome" label="Competência" error={erro("nome")} hint="Ex.: Excel, Python, atendimento ao cliente.">
              <Input id="hab-nome" name="nome" maxLength={100} className="py-2.5" />
            </Field>
          </div>
          <Field id="hab-categoria" label="Tipo">
            <Select id="hab-categoria" name="categoria" defaultValue="tecnica">
              <option value="tecnica">Técnica</option>
              <option value="comportamental">Comportamental</option>
            </Select>
          </Field>
        </>
      )}
    </FormCurto>
  );
}

export function IdiomaForm() {
  return (
    <FormCurto acao={salvarIdioma} rotulo="Incluir">
      {(erro) => (
        <>
          <div className="min-w-40 flex-1">
            <Field id="idioma-nome" label="Idioma" error={erro("idioma")}>
              <Input id="idioma-nome" name="idioma" maxLength={60} className="py-2.5" />
            </Field>
          </div>
          <Field id="idioma-nivel" label="Nível" error={erro("nivel")}>
            <Select id="idioma-nivel" name="nivel" defaultValue="basico">
              <option value="basico">Básico</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
              <option value="fluente">Fluente</option>
              <option value="nativo">Nativo</option>
            </Select>
          </Field>
        </>
      )}
    </FormCurto>
  );
}

export function CertificacaoForm() {
  return (
    <FormCurto acao={salvarCertificacao} rotulo="Incluir">
      {(erro) => (
        <>
          <div className="min-w-48 flex-1">
            <Field id="cert-nome" label="Curso ou certificação" error={erro("nome")}>
              <Input id="cert-nome" name="nome" maxLength={160} className="py-2.5" />
            </Field>
          </div>
          <div className="min-w-40">
            <Field id="cert-emissor" label="Instituição (opcional)">
              <Input id="cert-emissor" name="emissor" maxLength={160} className="py-2.5" />
            </Field>
          </div>
          <Field id="cert-data" label="Conclusão (opcional)" error={erro("concluido_em")}>
            <Input id="cert-data" name="concluido_em" type="month" className="py-2" />
          </Field>
        </>
      )}
    </FormCurto>
  );
}

// ---------------------------------------------------------------------------
// Análise com IA
// ---------------------------------------------------------------------------
export function AnalisarButton({ rotulo = "Analisar minhas experiências com IA" }: { rotulo?: string }) {
  const router = useRouter();
  const [resultado, setResultado] = useState<IaResultado | null>(null);
  const [pendente, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        pending={pendente}
        onClick={() =>
          start(async () => {
            const r = await analisarCompetencias();
            setResultado(r);
            if (r.status === "success") router.push("/curriculo/competencias");
          })
        }
      >
        {pendente ? "Analisando suas experiências…" : rotulo}
      </Button>
      {pendente && <p role="status" className="text-[13px] leading-5 text-muted">Isso pode levar alguns segundos.</p>}
      {resultado?.status === "error" && <FormMessage tone="error">{resultado.message}</FormMessage>}
      <p className={cn("text-[13px] leading-5 text-muted")}>
        A IA recebe só os textos das suas experiências e projetos, sem seu nome ou contato. Tudo o que ela sugerir
        aparece como sugestão: você confirma, edita ou descarta.
      </p>
    </div>
  );
}
