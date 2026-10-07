"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Algo deu errado ao abrir esta página."
      action={
        <Button variant="secondary" onClick={() => reset()}>
          Tentar novamente
        </Button>
      }
    />
  );
}
