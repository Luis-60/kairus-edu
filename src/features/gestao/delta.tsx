import { cn } from "@/lib/cn";
import { dec1, num } from "@/lib/format";

type DeltaProps = {
  atual: number | null;
  anterior: number | null;
  /** true quando uma queda é positiva (ex.: evasão). */
  menorMelhor: boolean;
  unidade: "pp" | "n";
};

/** Variação em relação ao período anterior: "▼ 0,6 p.p. vs. período anterior". */
export function Delta({ atual, anterior, menorMelhor, unidade }: DeltaProps) {
  if (atual == null || anterior == null) return <>sem período anterior para comparar</>;

  const diff = Number(atual) - Number(anterior);
  if (Math.abs(diff) < 0.05) return <>estável vs. período anterior</>;

  const bom = menorMelhor ? diff < 0 : diff > 0;
  const seta = diff < 0 ? "▼" : "▲";
  const valor = unidade === "pp" ? `${dec1(Math.abs(diff))} p.p.` : num(Math.abs(diff));

  return (
    <>
      <span className={cn("font-bold", bom ? "text-ok" : "text-danger")}>
        <span aria-hidden>{seta} </span>
        <span className="sr-only">{diff < 0 ? "queda de " : "alta de "}</span>
        {valor}
      </span>{" "}
      vs. período anterior
    </>
  );
}
