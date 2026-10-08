"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import type { IaState } from "./actions";

type Props = {
  acao: (prev: IaState) => Promise<IaState>;
  rotulo: string;
  rotuloPendente: string;
  variante?: "primary" | "secondary";
  sucesso?: string;
};

/** Botão que dispara uma geração com IA, com estado de carregamento e retorno de erro. */
export function GerarButton({ acao, rotulo, rotuloPendente, variante = "primary", sucesso }: Props) {
  const [state, action, pending] = useActionState(acao, { status: "idle" });

  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <Button type="submit" variant={variante} pending={pending}>
        {pending ? rotuloPendente : rotulo}
      </Button>
      {pending && (
        <p role="status" className="text-[13px] leading-5 text-muted">
          Isso pode levar alguns segundos.
        </p>
      )}
      {!pending && state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      {!pending && state.status === "success" && sucesso && <FormMessage tone="success">{sucesso}</FormMessage>}
    </form>
  );
}
