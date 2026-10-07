"use client";

import Link from "next/link";
import { useActionState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { solicitarRecuperacao, type FormState } from "./actions";
import { recuperarSchema } from "./schemas";

const inicial: FormState = { status: "idle" };

export function RecuperarForm() {
  const [state, action, pending] = useActionState(solicitarRecuperacao, inicial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof recuperarSchema>>({ resolver: zodResolver(recuperarSchema) });

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set("email", values.email);
    startTransition(() => action(fd));
  });

  const erro = errors.email?.message ?? state.fieldErrors?.email;

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.015em]">Recuperar acesso</h1>
        <p className="text-muted">Enviaremos um link para você definir uma nova senha.</p>
      </div>

      {state.status === "success" && <FormMessage tone="success">{state.message}</FormMessage>}
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <Field id="email" label="E-mail institucional" error={erro}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nome@universidade.edu.br"
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? "email-error" : undefined}
          {...register("email")}
        />
      </Field>

      <Button type="submit" pending={pending} disabled={state.status === "success"}>
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
      <Link href="/login" className="text-center text-[13px] leading-5 font-semibold text-primary hover:text-primary-hover">
        Voltar para o login
      </Link>
    </form>
  );
}
