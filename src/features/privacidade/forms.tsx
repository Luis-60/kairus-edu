"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { abrirPedidoTitular, excluirDadosCarreira, responderPedidoTitular, type PrivacidadeResultado } from "./actions";

const inicial: PrivacidadeResultado = { status: "idle" };

function semLimpar(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

export function PedidoTitularForm() {
  const [state, action, pending] = useActionState(abrirPedidoTitular, inicial);
  const [chave, setChave] = useState(0);
  const [visto, setVisto] = useState(state);
  if (state !== visto) {
    setVisto(state);
    if (state.status === "success") setChave((k) => k + 1);
  }
  return (
    <form key={chave} action={action} onSubmit={semLimpar(action)} noValidate className="flex flex-col gap-4">
      {state.status === "success" && <FormMessage tone="success">{state.message}</FormMessage>}
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field id="titular-tipo" label="O que você precisa?" error={state.fieldErrors?.tipo}>
        <Select id="titular-tipo" name="tipo" defaultValue="correcao">
          <option value="correcao">Corrigir um dado</option>
          <option value="acesso">Acessar todos os dados que a instituição tem sobre mim</option>
          <option value="exclusao">Excluir dados</option>
          <option value="outro">Outro pedido sobre meus dados</option>
        </Select>
      </Field>
      <Field id="titular-mensagem" label="Descreva o pedido" error={state.fieldErrors?.mensagem}>
        <Textarea id="titular-mensagem" name="mensagem" rows={4} maxLength={1000} aria-invalid={Boolean(state.fieldErrors?.mensagem)} />
      </Field>
      <Button type="submit" pending={pending} className="self-start">
        {pending ? "Enviando…" : "Enviar pedido"}
      </Button>
    </form>
  );
}

export function ExcluirCarreira() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<PrivacidadeResultado | null>(null);
  const [pendente, start] = useTransition();

  if (!aberto) {
    return (
      <div className="flex flex-col items-start gap-3">
        {resultado?.status === "success" && <FormMessage tone="success">{resultado.message}</FormMessage>}
        <Button variant="secondary" onClick={() => setAberto(true)}>
          Excluir meus dados de carreira
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-danger p-4">
      <p className="font-semibold text-danger">Esta ação não pode ser desfeita.</p>
      <p className="text-[13px] leading-5 text-body">
        Serão excluídos seu perfil profissional, experiências, projetos, competências, idiomas, certificações, todas as
        versões de currículo, arquivos enviados ao scanner e análises de vaga. Seus dados acadêmicos não são afetados.
      </p>
      <Field id="excluir-confirmacao" label='Para confirmar, digite "EXCLUIR"'>
        <Input id="excluir-confirmacao" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" className="max-w-60 py-2.5" />
      </Field>
      {resultado?.status === "error" && <FormMessage tone="error">{resultado.message}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button
          pending={pendente}
          disabled={texto.trim().toUpperCase() !== "EXCLUIR"}
          className="bg-danger hover:bg-danger"
          onClick={() =>
            start(async () => {
              const r = await excluirDadosCarreira(texto);
              setResultado(r);
              if (r.status === "success") {
                setAberto(false);
                setTexto("");
                router.refresh();
              }
            })
          }
        >
          {pendente ? "Excluindo…" : "Excluir definitivamente"}
        </Button>
        <Button variant="ghost" onClick={() => setAberto(false)} disabled={pendente}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function ResponderPedidoForm({ id, status, resposta }: { id: string; status: string; resposta: string | null }) {
  const [state, action, pending] = useActionState(responderPedidoTitular, inicial);
  return (
    <form action={action} onSubmit={semLimpar(action)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-3">
        <Field id={`st-${id}`} label="Situação">
          <Select id={`st-${id}`} name="status" defaultValue={status}>
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </Select>
        </Field>
      </div>
      <Field id={`resp-${id}`} label="Resposta ao aluno" hint="O aluno lê esta resposta em Meus dados.">
        <Textarea id={`resp-${id}`} name="resposta" rows={3} maxLength={2000} defaultValue={resposta ?? ""} />
      </Field>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "success" && <FormMessage tone="success">{state.message}</FormMessage>}
      <Button type="submit" variant="secondary" pending={pending} className="self-start">
        Salvar
      </Button>
    </form>
  );
}
