import Link from "next/link";
import { num } from "@/lib/format";

type Props = {
  pagina: number;
  porPagina: number;
  total: number;
  href: (pagina: number) => string;
};

export function Pagination({ pagina, porPagina, total, href }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const de = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const ate = Math.min(pagina * porPagina, total);
  const link = "min-h-9 rounded-control border border-line px-3 py-1.5 text-[13px] leading-5 font-semibold hover:border-primary hover:text-primary";
  const desativado = "min-h-9 rounded-control border border-line px-3 py-1.5 text-[13px] leading-5 font-semibold text-muted opacity-50";

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-[13px] leading-5 text-muted">
        {total === 0 ? "Nenhum resultado" : `Mostrando ${num(de)}–${num(ate)} de ${num(total)}`}
      </p>
      <div className="flex items-center gap-2">
        {pagina > 1 ? (
          <Link href={href(pagina - 1)} className={link} rel="prev">
            Anterior
          </Link>
        ) : (
          <span className={desativado} aria-disabled>
            Anterior
          </span>
        )}
        <span className="text-[13px] leading-5 text-muted">
          {pagina} de {paginas}
        </span>
        {pagina < paginas ? (
          <Link href={href(pagina + 1)} className={link} rel="next">
            Próxima
          </Link>
        ) : (
          <span className={desativado} aria-disabled>
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}
