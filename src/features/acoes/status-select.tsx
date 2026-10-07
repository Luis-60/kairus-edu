"use client";

import { startTransition, useActionState } from "react";
import { cn } from "@/lib/cn";
import type { AcaoState } from "./actions";

type Opcao = { value: string; label: string };

type Props = {
  id: string;
  campoId: string;
  valor: string;
  opcoes: Opcao[];
  rotulo: string;
  acao: (prev: AcaoState, fd: FormData) => Promise<AcaoState>;
};

/** Seletor de status que salva ao mudar. Fica desabilitado enquanto salva. */
export function StatusSelect({ id, campoId, valor, opcoes, rotulo, acao }: Props) {
  const [state, action, pending] = useActionState(acao, { status: "idle" });

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`status-${id}`} className="sr-only">
        {rotulo}
      </label>
      <select
        id={`status-${id}`}
        defaultValue={valor}
        disabled={pending}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const fd = new FormData();
          fd.set(campoId, id);
          fd.set("status", e.target.value);
          startTransition(() => action(fd));
        }}
        className={cn(
          "min-h-9 rounded-control border border-line-strong bg-surface px-2 py-1 text-[13px] leading-5 font-semibold",
          pending && "opacity-60",
        )}
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {state.status === "error" && (
        <span role="alert" className="text-xs font-semibold text-danger">
          {state.message}
        </span>
      )}
    </div>
  );
}
