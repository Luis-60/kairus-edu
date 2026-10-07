const decimal1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const inteiro = new Intl.NumberFormat("pt-BR");
const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

/** 20.2 -> "20,2%" */
export function pct1(valor: number | null | undefined): string {
  return valor == null ? "—" : `${decimal1.format(Number(valor))}%`;
}

/** 0.78 -> "78%" */
export function probabilidade(valor: number | null | undefined): string {
  return valor == null ? "—" : `${Math.round(Number(valor) * 100)}%`;
}

export function num(valor: number | null | undefined): string {
  return valor == null ? "—" : inteiro.format(Number(valor));
}

export function dec1(valor: number | null | undefined): string {
  return valor == null ? "—" : decimal1.format(Number(valor));
}

/** Datas "YYYY-MM-DD" ou ISO, exibidas como dd/mm/aaaa. */
export function dataCurta(valor: string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00Z` : valor);
  return Number.isNaN(d.getTime()) ? "—" : data.format(d);
}
