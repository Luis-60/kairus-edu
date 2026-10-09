"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Select } from "@/components/ui/form";
import { atualizarHabilidade } from "./perfil-actions";

type Habilidade = {
  id: string;
  nome: string;
  categoria: "tecnica" | "comportamental";
  evidencia: string | null;
  origem: "aluno" | "ia" | "instituicao";
  status: "sugerida" | "confirmada" | "rejeitada";
};

const ORIGEM: Record<Habilidade["origem"], string> = {
  ia: "Sugerida pela IA",
  aluno: "Informada por você",
  instituicao: "Reconhecida pela instituição",
};

/** Uma competência com evidência e os controles de confirmar, editar e descartar. */
export function CompetenciaItem({ h }: { h: Habilidade }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(h.nome);
  const [categoria, setCategoria] = useState(h.categoria);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  const salvar = (campos: Parameters<typeof atualizarHabilidade>[0]) =>
    start(async () => {
      setErro(null);
      const r = await atualizarHabilidade(campos);
      if (r.status === "error") setErro(r.message ?? "Não foi possível atualizar.");
      else setEditando(false);
    });

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0">
      {editando ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="sr-only" htmlFor={`nome-${h.id}`}>
            Nome da competência
          </label>
          <Input id={`nome-${h.id}`} value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} className="max-w-80 py-2" />
          <label className="sr-only" htmlFor={`cat-${h.id}`}>
            Tipo
          </label>
          <Select id={`cat-${h.id}`} value={categoria} onChange={(e) => setCategoria(e.target.value as Habilidade["categoria"])}>
            <option value="tecnica">Técnica</option>
            <option value="comportamental">Comportamental</option>
          </Select>
          <Button size="sm" pending={pendente} onClick={() => salvar({ id: h.id, nome, categoria, status: "confirmada" })}>
            Salvar e confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{h.nome}</span>
          <Badge tone={h.categoria === "tecnica" ? "info" : "neutral"}>{h.categoria === "tecnica" ? "Técnica" : "Comportamental"}</Badge>
          <span className="text-xs leading-4 text-muted">{ORIGEM[h.origem]}</span>
        </div>
      )}

      {h.evidencia && (
        <p className="text-[13px] leading-5 text-body">
          <span className="font-semibold text-muted">Evidência:</span> “{h.evidencia}”
        </p>
      )}

      {!editando && (
        <div className="flex flex-wrap gap-2">
          {h.status !== "confirmada" && (
            <Button size="sm" pending={pendente} onClick={() => salvar({ id: h.id, status: "confirmada" })} aria-label={`Confirmar ${h.nome}`}>
              Confirmar
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setEditando(true)} aria-label={`Editar ${h.nome}`}>
            Editar
          </Button>
          {h.status !== "rejeitada" ? (
            <Button size="sm" variant="ghost" pending={pendente} onClick={() => salvar({ id: h.id, status: "rejeitada" })} aria-label={`Descartar ${h.nome}`}>
              {h.status === "confirmada" ? "Remover do currículo" : "Descartar"}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" pending={pendente} onClick={() => salvar({ id: h.id, status: "sugerida" })} aria-label={`Restaurar ${h.nome}`}>
              Restaurar
            </Button>
          )}
        </div>
      )}
      {erro && <FormMessage tone="error">{erro}</FormMessage>}
    </li>
  );
}
