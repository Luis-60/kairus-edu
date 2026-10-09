"use client";

import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import type { AcaoState } from "@/features/acoes/actions";
import { registrarPedido } from "./equipe-actions";

const inicial: AcaoState = { status: "idle" };

/** Registro manual de pedido de trancamento ou cancelamento, em painel lateral. */
export function RegistrarPedido() {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(registrarPedido, inicial);

  return (
    <>
      <Button variant="secondary" onClick={() => setAberto(true)}>
        Registrar pedido
      </Button>
      <Sheet
        open={aberto}
        onOpenChange={setAberto}
        title="Registrar pedido"
        description="Use quando o pedido chegou por outro canal e não veio do sistema acadêmico."
      >
        <form
          action={action}
          onSubmit={(e) => {
            // Sem o reset automático: se o código for recusado, o campo continua preenchido.
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => action(fd));
          }}
          className="flex flex-col gap-5"
        >
          {state.status === "success" && <FormMessage tone="success">{state.message}</FormMessage>}
          {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
          <Field id="pedido-codigo" label="Código de matrícula" error={state.fieldErrors?.codigo}>
            <Input
              id="pedido-codigo"
              name="codigo"
              required
              maxLength={12}
              autoComplete="off"
              placeholder="Ex.: A04112"
              aria-invalid={Boolean(state.fieldErrors?.codigo)}
              aria-describedby={state.fieldErrors?.codigo ? "pedido-codigo-error" : undefined}
            />
          </Field>
          <Field id="pedido-tipo" label="Tipo de pedido" error={state.fieldErrors?.tipo}>
            <Select id="pedido-tipo" name="tipo" defaultValue="trancamento">
              <option value="trancamento">Trancamento</option>
              <option value="cancelamento">Cancelamento</option>
            </Select>
          </Field>
          <p className="text-[13px] leading-5 text-muted">
            O risco do aluno no momento do registro fica guardado e não muda depois. O questionário fica disponível para o
            aluno responder, se quiser.
          </p>
          <Button type="submit" pending={pending}>
            {pending ? "Registrando…" : "Registrar pedido"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
