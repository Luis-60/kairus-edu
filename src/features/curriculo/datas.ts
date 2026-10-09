/** "2024-03-01" -> "03/2024". */
export function mesAno(data: string | null | undefined) {
  if (!data) return "";
  const [ano, mes] = data.split("-");
  return `${mes}/${ano}`;
}

/** "2024-03-01" -> "2024-03" (valor de <input type="month">). */
export function paraMes(data: string | null | undefined) {
  return data ? data.slice(0, 7) : "";
}

/** "03/2024 – atual", "03/2024 – 12/2024" ou "". */
export function periodo(inicio: string | null | undefined, fim: string | null | undefined, atual = false) {
  const i = mesAno(inicio);
  const f = atual ? "atual" : mesAno(fim);
  if (i && f) return `${i} – ${f}`;
  return i || f;
}
