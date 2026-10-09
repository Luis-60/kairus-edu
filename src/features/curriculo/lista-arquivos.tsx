"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, DownloadLink } from "@/components/ui/button";
import { excluirArquivo } from "./arquivo-actions";

export type ArquivoListado = {
  id: string;
  tipo: "versao" | "enviado";
  titulo: string;
  detalhe: string;
  pontuacao: number | null;
};

/** Lista de versões geradas ou arquivos enviados, com download por link assinado e exclusão. */
export function ListaArquivos({ itens, vazio }: { itens: ArquivoListado[]; vazio: string }) {
  if (itens.length === 0) return <p className="text-[13px] leading-5 text-muted">{vazio}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {itens.map((a) => (
        <Linha key={`${a.tipo}-${a.id}`} a={a} />
      ))}
    </ul>
  );
}

function Linha({ a }: { a: ArquivoListado }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pendente, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
      <div className="min-w-0">
        <div className="font-semibold">{a.titulo}</div>
        <div className="text-[13px] leading-5 text-muted">{a.detalhe}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {a.pontuacao !== null && (
          <Badge tone={a.pontuacao >= 80 ? "ok" : a.pontuacao >= 60 ? "warn" : "danger"}>Leitura {a.pontuacao}/100</Badge>
        )}
        <DownloadLink href={`/curriculo/arquivo/${a.tipo}/${a.id}`} size="sm">
          Baixar
        </DownloadLink>
        {confirmar ? (
          <>
            <Button size="sm" variant="secondary" pending={pendente} onClick={() => start(async () => void (await excluirArquivo(a.tipo, a.id)))}>
              Confirmar exclusão
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmar(true)} aria-label={`Excluir ${a.titulo}`}>
            Excluir
          </Button>
        )}
      </div>
    </li>
  );
}
