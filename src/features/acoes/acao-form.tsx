"use client";

import { startTransition, useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { TIPO_ACAO } from "@/lib/labels";
import { registrarAcao, type AcaoState } from "./actions";
import { novaAcaoSchema, TIPOS_ACAO, type NovaAcaoInput } from "./schemas";

type Membro = { id: string; nome: string };

type Props = {
  estudanteId: string;
  tipoSugerido: NovaAcaoInput["tipo"];
  descricaoSugerida: string;
  equipe: Membro[];
  responsavelPadrao: string;
};

const inicial: AcaoState = { status: "idle" };

function emDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function AcaoForm({ estudanteId, tipoSugerido, descricaoSugerida, equipe, responsavelPadrao }: Props) {
  const [state, action, pending] = useActionState(registrarAcao, inicial);
  // Guarda o resultado vigente quando o formulário foi aberto; um novo sucesso o fecha.
  const [abertoEm, setAbertoEm] = useState<AcaoState | null>(null);
  const aberto = abertoEm !== null && (abertoEm === state || state.status !== "success");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NovaAcaoInput>({
    resolver: zodResolver(novaAcaoSchema),
    defaultValues: {
      estudanteId,
      tipo: tipoSugerido,
      descricao: descricaoSugerida,
      responsavelId: responsavelPadrao,
      prazo: emDias(7),
    },
  });

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    startTransition(() => action(fd));
  });

  const erro = (campo: keyof NovaAcaoInput) => errors[campo]?.message ?? state.fieldErrors?.[campo];

  if (!aberto) {
    return (
      <div className="flex flex-col items-start gap-3">
        {state.status === "success" && <FormMessage tone="success">{state.message}</FormMessage>}
        <Button
          onClick={() => {
            reset();
            setAbertoEm(state);
          }}
        >
          Registrar ação
        </Button>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <input type="hidden" {...register("estudanteId")} />

      <Field id="acao-tipo" label="Tipo de ação" error={erro("tipo")}>
        <Select id="acao-tipo" aria-invalid={Boolean(erro("tipo"))} {...register("tipo")}>
          {TIPOS_ACAO.map((t) => (
            <option key={t} value={t}>
              {TIPO_ACAO[t]}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="acao-descricao" label="O que será feito" error={erro("descricao")}>
        <Textarea
          id="acao-descricao"
          rows={3}
          aria-invalid={Boolean(erro("descricao"))}
          aria-describedby={erro("descricao") ? "acao-descricao-error" : undefined}
          {...register("descricao")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="acao-responsavel" label="Responsável" error={erro("responsavelId")}>
          <Select id="acao-responsavel" aria-invalid={Boolean(erro("responsavelId"))} {...register("responsavelId")}>
            {equipe.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="acao-prazo" label="Prazo" error={erro("prazo")}>
          <Input
            id="acao-prazo"
            type="date"
            min={emDias(0)}
            aria-invalid={Boolean(erro("prazo"))}
            aria-describedby={erro("prazo") ? "acao-prazo-error" : undefined}
            {...register("prazo")}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending}>
          {pending ? "Registrando…" : "Confirmar registro"}
        </Button>
        <Button variant="secondary" onClick={() => setAbertoEm(null)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
