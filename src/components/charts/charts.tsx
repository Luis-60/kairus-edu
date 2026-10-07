import { cn } from "@/lib/cn";
import { pct1 } from "@/lib/format";

type Ponto = { rotulo: string; valor: number };

/** Linha com área, no estilo do gráfico "Evolução da evasão" do protótipo. */
export function LineChart({ dados, descricao }: { dados: Ponto[]; descricao: string }) {
  const W = 640;
  const H = 220;
  const esq = 40;
  const dir = 620;
  const topo = 30;
  const base = 180;

  const valores = dados.map((d) => d.valor);
  const min = Math.floor(Math.min(...valores) - 2);
  const max = Math.ceil(Math.max(...valores) + 2);
  const y = (v: number) => base - ((v - min) / Math.max(max - min, 1)) * (base - topo);
  const passo = dados.length > 1 ? (dir - esq - 60) / (dados.length - 1) : 0;
  const x = (i: number) => esq + 30 + i * passo;
  const pontos = dados.map((d, i) => `${x(i)},${y(d.valor)}`).join(" ");
  const grade = [max, (max + min) / 2, min];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descricao} className="block h-auto w-full">
      {grade.map((g) => (
        <g key={g}>
          <line x1={esq} y1={y(g)} x2={dir} y2={y(g)} stroke="var(--color-line)" />
          <text x={0} y={y(g) + 4} fontSize={12} fill="var(--color-muted)">
            {Math.round(g)}%
          </text>
        </g>
      ))}
      {dados.length > 1 && (
        <polygon
          points={`${x(0)},${y(dados[0].valor)} ${pontos} ${x(dados.length - 1)},${base} ${x(0)},${base}`}
          fill="var(--color-tint)"
        />
      )}
      <polyline
        points={pontos}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {dados.map((d, i) => {
        const ultimo = i === dados.length - 1;
        return (
          <g key={d.rotulo}>
            <circle
              cx={x(i)}
              cy={y(d.valor)}
              r={ultimo ? 7 : 5}
              fill={ultimo ? "var(--color-accent)" : "var(--color-primary)"}
              stroke={ultimo ? "#ffffff" : undefined}
              strokeWidth={ultimo ? 3 : undefined}
            />
            <text x={x(i)} y={y(d.valor) - 14} fontSize={13} fontWeight={700} fill="var(--color-navy)" textAnchor="middle">
              {pct1(d.valor)}
            </text>
            <text x={x(i)} y={204} fontSize={12} fill="var(--color-muted)" textAnchor="middle">
              {d.rotulo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type Barra = { rotulo: string; valor: number; texto: string };

/** Lista de barras horizontais: rótulo, barra proporcional e valor. */
export function BarList({ dados, cor = "bg-primary", className }: { dados: Barra[]; cor?: string; className?: string }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <ul className={cn("flex flex-col", className)}>
      {dados.map((d) => (
        <li
          key={d.rotulo}
          className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_52px] items-center gap-3 py-1.5 text-[13px] leading-5"
        >
          <span className="min-w-0">{d.rotulo}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-tint" aria-hidden>
            <div className={cn("h-full rounded-full", cor)} style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
          <span className="tabular text-right font-bold">{d.texto}</span>
        </li>
      ))}
    </ul>
  );
}

/** Colunas verticais; destaca as colunas acima da média. */
export function ColumnChart({ dados, descricao }: { dados: Barra[]; descricao: string }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const media = dados.reduce((s, d) => s + d.valor, 0) / Math.max(dados.length, 1);
  return (
    <div role="img" aria-label={descricao} className="flex h-37.5 items-end gap-2 sm:gap-3">
      {dados.map((d) => (
        <div key={d.rotulo} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="tabular hidden text-xs leading-4 font-bold sm:block">{d.texto}</span>
          <div
            className={cn("w-full rounded-t-control", d.valor > media ? "bg-primary" : "bg-tint-strong")}
            style={{ height: `${(d.valor / max) * 100}px` }}
          />
          <span className="text-xs leading-4 text-muted">{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
