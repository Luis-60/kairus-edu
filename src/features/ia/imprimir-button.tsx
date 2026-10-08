"use client";

import { Button } from "@/components/ui/button";

export function ImprimirButton() {
  return <Button onClick={() => window.print()}>Imprimir ou salvar em PDF</Button>;
}
