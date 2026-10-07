"use client";

import { useActionState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { redefinirSenha, type FormState } from "./actions";
import { novaSenhaSchema, type NovaSenhaInput } from "./schemas";

const inicial: FormState = { status: "idle" };

export function RedefinirForm() {
  const [state, action, pending] = useActionState(redefinirSenha, inicial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NovaSenhaInput>({ resolver: zodResolver(novaSenhaSchema) });

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set("senha", values.senha);
    fd.set("confirmacao", values.confirmacao);
    startTransition(() => action(fd));
  });

  const erroSenha = errors.senha?.message ?? state.fieldErrors?.senha;
  const erroConfirmacao = errors.confirmacao?.message ?? state.fieldErrors?.confirmacao;

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.015em]">Definir nova senha</h1>
        <p className="text-muted">Use pelo menos 8 caracteres, com letras e números.</p>
      </div>

      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <Field id="senha" label="Nova senha" error={erroSenha}>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(erroSenha)}
          aria-describedby={erroSenha ? "senha-error" : undefined}
          {...register("senha")}
        />
      </Field>
      <Field id="confirmacao" label="Confirme a nova senha" error={erroConfirmacao}>
        <Input
          id="confirmacao"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(erroConfirmacao)}
          aria-describedby={erroConfirmacao ? "confirmacao-error" : undefined}
          {...register("confirmacao")}
        />
      </Field>

      <Button type="submit" pending={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
