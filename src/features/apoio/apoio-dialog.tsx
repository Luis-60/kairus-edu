"use client";

import { startTransition, useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Select, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import type { AcaoState } from "@/features/acoes/actions";
import { ASSUNTO_APOIO } from "@/lib/labels";
import { enviarSolicitacao } from "./actions";
import { ASSUNTOS, novaSolicitacaoSchema, type NovaSolicitacaoInput } from "./schemas";

const inicial: AcaoState = { status: "idle" };

type Props = {
  assuntoSugerido: NovaSolicitacaoInput["assunto"];
  /** Falso quando já existe um pedido em aberto; o diálogo continua montado para exibir o retorno. */
  podeAbrir: boolean;
};

export function ApoioDialog({ assuntoSugerido, podeAbrir }: Props) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(enviarSolicitacao, inicial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NovaSolicitacaoInput>({
    resolver: zodResolver(novaSolicitacaoSchema),
    defaultValues: { assunto: assuntoSugerido, mensagem: "" },
  });

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set("assunto", values.assunto);
    fd.set("mensagem", values.mensagem);
    startTransition(() => action(fd));
  });

  const erroAssunto = errors.assunto?.message ?? state.fieldErrors?.assunto;
  const erroMensagem = errors.mensagem?.message ?? state.fieldErrors?.mensagem;

  return (
    <>
      {podeAbrir && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="min-h-11 self-start rounded-control border border-white bg-surface px-5 py-2.5 font-semibold text-navy hover:text-primary"
        >
          Falar com a coordenação
        </button>
      )}
      <Sheet
        open={aberto}
        onOpenChange={setAberto}
        title="Falar com a coordenação"
        description="Sua mensagem vai para a coordenação do seu curso."
      >
        {state.status === "success" ? (
          <div className="flex flex-col gap-4">
            <FormMessage tone="success">{state.message}</FormMessage>
            <Button variant="secondary" onClick={() => setAberto(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
            <Field id="apoio-assunto" label="Assunto" error={erroAssunto}>
              <Select id="apoio-assunto" aria-invalid={Boolean(erroAssunto)} {...register("assunto")}>
                {ASSUNTOS.map((a) => (
                  <option key={a} value={a}>
                    {ASSUNTO_APOIO[a]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id="apoio-mensagem"
              label="Como podemos ajudar?"
              error={erroMensagem}
              hint="Não inclua documentos, dados bancários ou senhas."
            >
              <Textarea
                id="apoio-mensagem"
                rows={6}
                aria-invalid={Boolean(erroMensagem)}
                aria-describedby={erroMensagem ? "apoio-mensagem-error" : "apoio-mensagem-hint"}
                {...register("mensagem")}
              />
            </Field>
            <Button type="submit" pending={pending}>
              {pending ? "Enviando…" : "Enviar pedido"}
            </Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
