"use client";

import Link from "next/link";
import { useActionState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { entrar, type FormState } from "./actions";
import { loginSchema, type LoginInput } from "./schemas";

const inicial: FormState = { status: "idle" };

export function LoginForm({ next, aviso }: { next?: string; aviso?: string }) {
  const [state, action, pending] = useActionState(entrar, inicial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set("email", values.email);
    fd.set("senha", values.senha);
    if (next) fd.set("next", next);
    startTransition(() => action(fd));
  });

  const erroEmail = errors.email?.message ?? state.fieldErrors?.email;
  const erroSenha = errors.senha?.message ?? state.fieldErrors?.senha;

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.015em]">Entrar</h1>
        <p className="text-muted">Use seu e-mail institucional.</p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}
      {aviso && state.status === "idle" && <FormMessage tone="info">{aviso}</FormMessage>}
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <Field id="email" label="E-mail institucional" error={erroEmail}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nome@universidade.edu.br"
          aria-invalid={Boolean(erroEmail)}
          aria-describedby={erroEmail ? "email-error" : undefined}
          {...register("email")}
        />
      </Field>

      <Field id="senha" label="Senha" error={erroSenha}>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          aria-invalid={Boolean(erroSenha)}
          aria-describedby={erroSenha ? "senha-error" : undefined}
          {...register("senha")}
        />
      </Field>

      <Button type="submit" pending={pending} className="py-3.5">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <Link href="/recuperar-senha" className="text-center text-[13px] leading-5 font-semibold text-primary hover:text-primary-hover">
        Esqueci minha senha
      </Link>
    </form>
  );
}
