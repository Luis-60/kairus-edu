"use client";

import { useOptimistic, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { atualizarStatusAcao } from "./actions";

type Props = {
  acaoId: string;
  concluida: boolean;
  /** Ações canceladas não podem ser concluídas pelo checkbox. */
  desabilitada?: boolean;
  rotulo: string;
};

/**
 * Marca a ação como concluída (ou a reabre como pendente). A mudança aparece na hora e é
 * desfeita se o servidor recusar.
 */
export function ConcluirCheckbox({ acaoId, concluida, desabilitada, rotulo }: Props) {
  const [marcada, setMarcadaOtimista] = useOptimistic(concluida);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <label
        className={cn(
          "inline-flex min-h-11 min-w-11 cursor-pointer items-center",
          (desabilitada || pendente) && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          type="checkbox"
          checked={marcada}
          disabled={desabilitada || pendente}
          aria-label={rotulo}
          title={marcada ? "Concluída. Desmarque para reabrir." : "Marcar como concluída"}
          onChange={(e) => {
            const concluir = e.target.checked;
            setErro(null);
            startTransition(async () => {
              setMarcadaOtimista(concluir);
              const fd = new FormData();
              fd.set("acaoId", acaoId);
              fd.set("status", concluir ? "concluida" : "pendente");
              const resultado = await atualizarStatusAcao({ status: "idle" }, fd);
              if (resultado.status === "error") setErro(resultado.message ?? "Não foi possível atualizar.");
            });
          }}
          className="size-5 shrink-0 cursor-pointer accent-ok disabled:cursor-not-allowed"
        />
      </label>
      {erro && (
        <span role="alert" className="text-xs font-semibold text-danger">
          {erro}
        </span>
      )}
    </div>
  );
}
