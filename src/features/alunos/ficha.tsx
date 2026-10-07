import { Badge, FAIXA, RiskBadge, type Tone } from "@/components/ui/badge";
import { EmptyState, Meter } from "@/components/ui/states";
import { AcaoForm } from "@/features/acoes/acao-form";
import type { NovaAcaoInput } from "@/features/acoes/schemas";
import { dataCurta, dec1, pct1, probabilidade } from "@/lib/format";
import { ASSUNTO_APOIO, STATUS_ACAO, TIPO_ACAO } from "@/lib/labels";
import type { Database } from "@/types/database";
import type { FichaAluno } from "./queries";

const TONS_STATUS: Record<Database["public"]["Enums"]["status_acao"], Tone> = {
  pendente: "warn",
  em_andamento: "info",
  concluida: "ok",
  cancelada: "neutral",
};

/** Associa o texto da ação sugerida pelo modelo a um tipo de ação. */
function tipoDaSugestao(texto: string | null): NovaAcaoInput["tipo"] {
  const t = (texto ?? "").toLowerCase();
  if (t.includes("tutoria")) return "tutoria";
  if (t.includes("monitoria")) return "monitoria";
  if (t.includes("financeiro")) return "apoio_financeiro";
  if (t.includes("grade")) return "ajuste_grade";
  if (t.includes("conversa")) return "conversa_individual";
  return "outro";
}

type Props = {
  ficha: FichaAluno;
  equipe: { id: string; nome: string }[];
  usuarioId: string;
};

export function Ficha({ ficha, equipe, usuarioId }: Props) {
  const pct = ficha.probabilidade != null ? Number(ficha.probabilidade) * 100 : null;
  const semAcaoNecessaria = ficha.faixa === "baixo";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-caps text-muted">Ficha do aluno {ficha.codigo}</div>
          <div className="text-[13px] leading-5 text-muted">
            {ficha.curso_nome}, {ficha.periodo_atual}º período
          </div>
          <div className="tabular text-5xl leading-14 font-extrabold tracking-[-0.03em]">
            {probabilidade(ficha.probabilidade)}
          </div>
        </div>
        <RiskBadge faixa={ficha.faixa} />
      </div>

      {pct != null && ficha.faixa && (
        <Meter value={pct} fillClassName={FAIXA[ficha.faixa].fill} trackClassName="bg-line" />
      )}
      <p className="text-[13px] leading-5 text-muted">
        O modelo identificou esta probabilidade de evasão com base nos padrões observados. Ela orienta a conversa e
        não é uma sentença.
      </p>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-control bg-canvas p-3">
          <dt className="label-caps text-muted">Frequência</dt>
          <dd className="tabular text-lg font-bold">{pct1(ficha.frequencia)}</dd>
        </div>
        <div className="rounded-control bg-canvas p-3">
          <dt className="label-caps text-muted">Coeficiente</dt>
          <dd className="tabular text-lg font-bold">{dec1(ficha.coeficiente)}</dd>
        </div>
      </dl>

      {ficha.fatores.length > 0 && (
        <div>
          <h3 className="label-caps mb-1 text-muted">Por que este aluno foi sinalizado?</h3>
          <ul>
            {ficha.fatores.map((f) => (
              <li
                key={f.fator}
                className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-3 py-1.5 text-[13px] leading-5"
              >
                <span>{f.fator}</span>
                <Meter value={f.peso * 100} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-card border border-line p-4">
        <div className="label-caps text-primary">Ação sugerida</div>
        <div className="font-bold">{ficha.acao_sugerida ?? "Sem sugestão do modelo"}</div>
        {ficha.acao_sugerida_descricao && (
          <div className="text-[13px] leading-5 text-body">{ficha.acao_sugerida_descricao}</div>
        )}
        <div className="mt-2">
          {semAcaoNecessaria && ficha.acoes.length === 0 ? (
            <p className="text-[13px] leading-5 text-muted">Manter acompanhamento de rotina.</p>
          ) : (
            <AcaoForm
              key={ficha.estudante_id}
              estudanteId={ficha.estudante_id}
              tipoSugerido={tipoDaSugestao(ficha.acao_sugerida)}
              descricaoSugerida={ficha.acao_sugerida_descricao ?? ""}
              equipe={equipe}
              responsavelPadrao={equipe.some((m) => m.id === usuarioId) ? usuarioId : (equipe[0]?.id ?? "")}
            />
          )}
        </div>
      </div>

      <div>
        <h3 className="label-caps mb-2 text-muted">Ações registradas</h3>
        {ficha.acoes.length === 0 ? (
          <EmptyState title="Nenhuma ação registrada para este aluno." />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {ficha.acoes.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 py-3 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{a.tipo ? TIPO_ACAO[a.tipo] : "Ação"}</span>
                  {a.status && <Badge tone={TONS_STATUS[a.status]}>{STATUS_ACAO[a.status]}</Badge>}
                </div>
                <p className="text-[13px] leading-5 text-body">{a.descricao}</p>
                <p className="text-[13px] leading-5 text-muted">
                  Responsável, {a.responsavel_nome ?? "—"}. Prazo, {dataCurta(a.prazo)}.
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {ficha.solicitacoes.length > 0 && (
        <div>
          <h3 className="label-caps mb-2 text-muted">Pedidos de apoio do aluno</h3>
          <ul className="flex flex-col gap-2">
            {ficha.solicitacoes.map((s) => (
              <li key={s.id} className="rounded-control bg-tint p-3 text-[13px] leading-5">
                <div className="font-bold">{s.assunto ? ASSUNTO_APOIO[s.assunto] : "Pedido de apoio"}</div>
                <p className="text-body">{s.mensagem}</p>
                <p className="text-muted">Enviado em {dataCurta(s.created_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[13px] leading-5 text-muted">Este acesso fica registrado na auditoria da instituição.</p>
    </div>
  );
}
