import type { Database } from "@/types/database";

export type Papel = Database["public"]["Enums"]["papel_usuario"];

export const PAPEL_LABEL: Record<Papel, string> = {
  gestor: "Gestão",
  coordenador: "Coordenação",
  apoio: "Equipe de apoio",
  estudante: "Estudante",
};

export function homeFor(papel: Papel): string {
  switch (papel) {
    case "gestor":
      return "/gestao";
    case "coordenador":
      return "/alunos";
    case "apoio":
      return "/desligamentos";
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
    { href: "/empregabilidade", label: "Empregabilidade" },
    { href: "/privacidade", label: "Pedidos de privacidade" },
  ],
  coordenador: [
    { href: "/alunos", label: "Minha carteira" },
    { href: "/acoes", label: "Ações de permanência" },
    { href: "/desligamentos", label: "Pesquisa de desligamento" },
  ],
  apoio: [
    { href: "/desligamentos", label: "Pedidos de desligamento" },
    { href: "/acoes", label: "Ações de permanência" },
    { href: "/alunos", label: "Alunos" },
    { href: "/empregabilidade", label: "Empregabilidade" },
  ],
  estudante: [
    { href: "/minha-jornada", label: "Minha jornada" },
    { href: "/situacao-academica", label: "Situação acadêmica" },
    { href: "/carreira", label: "Carreira e estágio" },
    { href: "/curriculo", label: "Currículo" },
    { href: "/meus-dados", label: "Meus dados" },
  ],
};
