"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Label, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { enviarCurriculo, reanalisar, type ArquivoResultado } from "./arquivo-actions";
import { analisarVaga, gerarRascunho, type IaResultado } from "./ia-actions";

type Analise = { id: string; titulo: string };

/** Navega para o resultado quando a ação termina com sucesso (efeito, nunca durante a renderização). */
function useRedirecionarAoSalvar<T extends { status: string; id?: string }>(state: T, url: (id: string) => string) {
  const router = useRouter();
  const destino = state.status === "success" && state.id ? url(state.id) : null;
  useEffect(() => {
    if (destino) router.push(destino, { scroll: false });
  }, [state, destino, router]);
}

export function EnviarCurriculoForm({ analises }: { analises: Analise[] }) {
  const [state, action, pending] = useActionState(enviarCurriculo, { status: "idle" } as ArquivoResultado);
  useRedirecionarAoSalvar(state, (id) => `/curriculo/ats?arquivo=enviado:${id}`);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <Field id="ats-arquivo" label="Seu currículo (PDF ou DOCX, até 4 MB)">
            <input
              id="ats-arquivo"
              name="arquivo"
              type="file"
              required
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="block w-full rounded-control border border-line-strong bg-surface p-2 text-[13px] file:mr-3 file:rounded-control file:border-0 file:bg-tint file:px-3 file:py-1.5 file:font-semibold file:text-primary"
            />
          </Field>
        </div>
        {analises.length > 0 && (
          <Field id="ats-vaga" label="Conferir termos da vaga (opcional)">
            <Select id="ats-vaga" name="analiseId" defaultValue="">
              <option value="">Nenhuma</option>
              {analises.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.titulo}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button type="submit" pending={pending}>
          {pending ? "Analisando…" : "Analisar arquivo"}
        </Button>
      </div>
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <p className="text-[13px] leading-5 text-muted">
        O arquivo fica guardado só para você, em área privada, e pode ser excluído quando quiser. A análise de leitura não usa
        IA: lemos o texto do arquivo como um sistema de recrutamento leria.
      </p>
    </form>
  );
}

export function ReanalisarForm({ tipo, id, analises }: { tipo: "versao" | "enviado"; id: string; analises: Analise[] }) {
  const [state, action, pending] = useActionState(reanalisar, { status: "idle" } as ArquivoResultado);
  if (analises.length === 0) return null;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`re-${id}`}>Conferir termos de outra vaga</Label>
        <Select id={`re-${id}`} name="analiseId" defaultValue="">
          <option value="">Nenhuma</option>
          {analises.map((a) => (
            <option key={a.id} value={a.id}>
              {a.titulo}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" size="sm" pending={pending}>
        Analisar de novo
      </Button>
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}

export function AnalisarVagaForm({ vagas }: { vagas: { id: string; titulo: string }[] }) {
  const [origem, setOrigem] = useState<"vaga" | "colada">(vagas.length ? "vaga" : "colada");
  const [state, action, pending] = useActionState(analisarVaga, { status: "idle" } as IaResultado);
  useRedirecionarAoSalvar(state, (id) => `/curriculo/ats?analise=${id}#aderencia`);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="origem" value={origem} />
      <div role="radiogroup" aria-label="Origem da vaga" className="inline-flex gap-1 self-start rounded-card border border-line bg-canvas p-1">
        {vagas.length > 0 && (
          <button
            type="button"
            role="radio"
            aria-checked={origem === "vaga"}
            onClick={() => setOrigem("vaga")}
            className={cn("min-h-10 rounded-control px-4 text-[13px] font-semibold", origem === "vaga" ? "bg-surface text-primary shadow-card" : "text-muted")}
          >
            Vaga do KairusEdu
          </button>
        )}
        <button
          type="button"
          role="radio"
          aria-checked={origem === "colada"}
          onClick={() => setOrigem("colada")}
          className={cn("min-h-10 rounded-control px-4 text-[13px] font-semibold", origem === "colada" ? "bg-surface text-primary shadow-card" : "text-muted")}
        >
          Colar descrição de vaga
        </button>
      </div>
      {origem === "vaga" ? (
        <Field id="av-vaga" label="Vaga">
          <Select id="av-vaga" name="vagaId" required>
            {vagas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.titulo}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field id="av-descricao" label="Descrição completa da vaga" hint="Cole requisitos, atividades e diferenciais. Não cole dados pessoais de terceiros.">
          <Textarea id="av-descricao" name="descricao" rows={8} maxLength={8000} required minLength={80} />
        </Field>
      )}
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" pending={pending} className="self-start">
        {pending ? "Comparando com o seu perfil…" : "Analisar aderência"}
      </Button>
    </form>
  );
}

export function AdaptarCurriculoButton({ analiseId }: { analiseId: string }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        pending={pendente}
        onClick={() =>
          start(async () => {
            const r = await gerarRascunho({ analiseId });
            if (r.status === "error") setErro(r.message ?? "Não foi possível adaptar.");
            else router.push("/curriculo/editor");
          })
        }
      >
        {pendente ? "Adaptando…" : "Adaptar meu currículo para esta vaga"}
      </Button>
      <p className="text-xs leading-4 text-muted">Substitui o rascunho atual. Requisitos não confirmados não são incluídos.</p>
      {erro && <FormMessage tone="error">{erro}</FormMessage>}
    </div>
  );
}
