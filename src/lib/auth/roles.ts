import type { Database } from "@/types/database";

export type Papel = Database["public"]["Enums"]["papel_usuario"];

export const PAPEL_LABEL: Record<Papel, string> = {
  gestor: "Gestão",
  coordenador: "Coordenação",
  estudante: "Estudante",
};

export function homeFor(papel: Papel): string {
  switch (papel) {
    case "gestor":
      return "/gestao";
    case "coordenador":
      return "/alunos";
    case "estudante":
      return "/minha-jornada";
  }
}

export type NavItem = { href: string; label: string };

export const NAVEGACAO: Record<Papel, NavItem[]> = {
  gestor: [
    { href: "/gestao", label: "Visão geral" },
    { href: "/inteligencia", label: "Inteligência" },
    { href: "/alunos", label: "Alunos" },
    { href: "/acoes", label: "Ações de permanência" },
    { href: "/desligamentos", label: "Pesquisas de desligamento" },
  ],
  coordenador: [
    { href: "/alunos", label: "Minha carteira" },
    { href: "/acoes", label: "Ações de permanência" },
    { href: "/desligamentos", label: "Pesquisa de desligamento" },
  ],
  estudante: [
    { href: "/minha-jornada", label: "Minha jornada" },
    { href: "/carreira", label: "Carreira e estágio" },
  ],
};
