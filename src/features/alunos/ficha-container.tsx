"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

type Props = {
  aberta: boolean;
  codigo?: string;
  fecharHref: string;
  children: ReactNode;
};

/**
 * Desktop: ficha ao lado da lista, como no protótipo.
 * Tablet e mobile: a mesma ficha abre em um painel lateral sobre a lista.
 */
export function FichaContainer({ aberta, codigo, fecharHref, children }: Props) {
  const desktop = useMediaQuery("(min-width: 1280px)");
  const router = useRouter();

  if (desktop) {
    return (
      <Panel id="ficha" className="sticky top-6 shadow-raised">
        {children}
      </Panel>
    );
  }

  return (
    <Sheet
      open={aberta}
      onOpenChange={(open) => {
        if (!open) router.push(fecharHref, { scroll: false });
      }}
      title={codigo ? `Ficha do aluno ${codigo}` : "Ficha do aluno"}
    >
      {children}
    </Sheet>
  );
}
