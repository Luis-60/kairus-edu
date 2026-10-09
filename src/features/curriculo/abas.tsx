import { LinkTabs } from "@/components/ui/tabs";

const ABAS = [
  { href: "/curriculo", label: "Visão geral" },
  { href: "/curriculo/perfil", label: "Perfil profissional" },
  { href: "/curriculo/competencias", label: "Competências" },
  { href: "/curriculo/editor", label: "Currículo" },
  { href: "/curriculo/ats", label: "Scanner ATS" },
];

export function CurriculoAbas({ atual }: { atual: string }) {
  return <LinkTabs rotulo="Seções do currículo" abas={ABAS.map((a) => ({ ...a, ativa: a.href === atual }))} />;
}
