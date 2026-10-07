"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { Sheet } from "@/components/ui/sheet";
import { sair } from "@/features/auth/actions";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/auth/roles";

type ShellProps = {
  nav: NavItem[];
  nome: string;
  papelLabel: string;
  instituicao: string;
  children: ReactNode;
};

function ativo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {nav.map((item) => {
        const atual = ativo(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={atual ? "page" : undefined}
              className={cn(
                "block rounded-control px-3 py-2.5 font-semibold",
                atual ? "bg-white/10 text-white" : "text-sidebar-text hover:text-white",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Conta({ nome, papelLabel, instituicao }: Omit<ShellProps, "nav" | "children">) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 px-3 pt-4">
      <div className="min-w-0 text-[13px] leading-5">
        <div className="truncate font-semibold text-white">{nome}</div>
        <div className="truncate text-sidebar-text">
          {papelLabel} · {instituicao}
        </div>
      </div>
      <form action={sair}>
        <button type="submit" className="min-h-9 font-semibold text-sidebar-text hover:text-white">
          Sair
        </button>
      </form>
    </div>
  );
}

export function AppShell({ nav, nome, papelLabel, instituicao, children }: ShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-control bg-surface px-3 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>

      {/* Desktop: sidebar fixa, como no protótipo. */}
      <nav
        aria-label="Navegação principal"
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between bg-navy px-4 py-6 text-white lg:flex"
      >
        <div className="flex flex-col gap-5">
          <Logo className="px-3" />
          <NavLinks nav={nav} />
        </div>
        <Conta nome={nome} papelLabel={papelLabel} instituicao={instituicao} />
      </nav>

      {/* Tablet e mobile: barra superior com menu em drawer. */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 text-white lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-expanded={menuAberto}
          className="min-h-11 rounded-control px-3 font-semibold text-sidebar-text hover:text-white"
        >
          Menu
        </button>
      </header>
      <Sheet
        open={menuAberto}
        onOpenChange={setMenuAberto}
        title="Menu"
        side="left"
        dark
        className="max-w-72"
      >
        <div className="flex h-full flex-col justify-between gap-6">
          <NavLinks nav={nav} onNavigate={() => setMenuAberto(false)} />
          <Conta nome={nome} papelLabel={papelLabel} instituicao={instituicao} />
        </div>
      </Sheet>

      <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
