"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Textarea } from "@/components/ui/form";
import { transformarVivencias, type IaState } from "./actions";

const schema = z.object({
  vivencias: z
    .string()
    .trim()
    .min(40, "Conte um pouco mais, com pelo menos 40 caracteres.")
    .max(3000, "Use no máximo 3000 caracteres."),
});

type Entrada = z.infer<typeof schema>;

const inicial: IaState = { status: "idle" };

export function VivenciasForm({ textoAtual }: { textoAtual: string | null }) {
  const [state, action, pending] = useActionState(transformarVivencias, inicial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Entrada>({ resolver: zodResolver(schema), defaultValues: { vivencias: textoAtual ?? "" } });

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set("vivencias", values.vivencias);
    startTransition(() => action(fd));
  });

  const erro = errors.vivencias?.message ?? state.fieldErrors?.vivencias;

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field
        id="vivencias"
        label="Suas vivências"
        error={erro}
        hint="O texto é processado por um serviço de IA externo. Não inclua nomes de outras pessoas, documentos ou dados de saúde."
      >
        <Textarea
          id="vivencias"
          rows={7}
          maxLength={3000}
          placeholder="Ex.: trabalhei dois anos no mercado da família, cuidando do estoque e do caixa nos fins de semana."
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? "vivencias-error" : "vivencias-hint"}
          {...register("vivencias")}
        />
      </Field>
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" pending={pending} className="self-start">
        {pending ? "Analisando suas vivências…" : "Transformar em competências"}
      </Button>
    </form>
  );
}
