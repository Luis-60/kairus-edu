"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { candidatar } from "./actions";

export function CandidatarButton({ vagaId, bloqueada }: { vagaId: string; bloqueada: boolean }) {
  const [state, action, pending] = useActionState(candidatar, { status: "idle" });

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="vagaId" value={vagaId} />
      <Button type="submit" pending={pending} disabled={bloqueada}>
        {pending ? "Enviando…" : "Candidatar-se"}
      </Button>
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
