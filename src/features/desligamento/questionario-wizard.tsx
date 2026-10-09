"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { MOTIVO } from "@/lib/labels";
import { enviarQuestionario, recusarQuestionario, salvarQuestionario } from "./actions";
import type { DadosQuestionario } from "./queries";
import {
  ETAPAS,
  LIMITE_TEXTO,
  MOTIVOS,
  PERGUNTA_COMENTARIO,
  PERGUNTA_OUTRO,
  perguntasDeContexto,
  RECONSIDERACOES,
  type Motivo,
  type Pergunta,
  type Reconsideracao,
} from "./questionario";

type Respostas = Record<string, string | null>;

function horaCurta(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function QuestionarioWizard({ dados }: { dados: DadosQuestionario }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(Math.min(Math.max(dados.etapa, 1), ETAPAS.length));
  const [motivos, setMotivos] = useState<Motivo[]>(dados.motivos);
  const [consentimento, setConsentimento] = useState(dados.consentimentoSaude);
  const [querSaude, setQuerSaude] = useState(dados.motivos.includes("saude"));
  const [respostas, setRespostas] = useState<Respostas>(() =>
    Object.fromEntries(Object.entries(dados.respostas).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))),
  );
  const [servicos, setServicos] = useState<string[]>(() => {
    const v = dados.respostas.servicos_interesse;
    return Array.isArray(v) ? v : [];
  });
  const [reconsideraria, setReconsideraria] = useState<Reconsideracao | null>(dados.reconsideraria);
  const [ciente, setCiente] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarRecusa, setConfirmarRecusa] = useState(false);
  const [enviando, startEnvio] = useTransition();
  const [salvando, setSalvando] = useState(false);
  const pendente = useRef(false);

  const contexto = useMemo(() => perguntasDeContexto(motivos), [motivos]);

  // Estado completo enviado a cada salvamento (o questionário é pequeno).
  const estado = useMemo(
    () => ({ etapa, motivos, consentimento, respostas, servicos, reconsideraria }),
    [etapa, motivos, consentimento, respostas, servicos, reconsideraria],
  );
  const ultimo = useRef(estado);

  const salvar = useCallback(async () => {
    const s = ultimo.current;
    pendente.current = false;
    setSalvando(true);
    const r = await salvarQuestionario({
      questionarioId: dados.id,
      etapa: s.etapa,
      consentimentoSaude: s.consentimento,
      motivos: s.motivos,
      respostas: s.respostas,
      servicos: s.servicos,
      reconsideraria: s.reconsideraria,
    });
    setSalvando(false);
    if (r.ok) {
      setSalvoEm(r.salvoEm);
      setErro(null);
    } else {
      setErro(r.message);
    }
    return r.ok;
  }, [dados.id]);

  // Salvamento automático: 1,2 s depois da última alteração.
  const primeira = useRef(true);
  useEffect(() => {
    ultimo.current = estado;
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    pendente.current = true;
    const t = setTimeout(() => void salvar(), 1200);
    return () => clearTimeout(t);
  }, [estado, salvar]);

  const responder = (id: string, valor: string | null) => setRespostas((r) => ({ ...r, [id]: valor }));

  const alternarMotivo = (m: Motivo, marcado: boolean) => {
    if (m === "saude") {
      setQuerSaude(marcado);
      if (!marcado) setMotivos((ms) => ms.filter((x) => x !== "saude"));
      else if (consentimento) setMotivos((ms) => [...ms, "saude"]);
      return;
    }
    setMotivos((ms) => (marcado ? [...ms, m] : ms.filter((x) => x !== m)));
  };

  const alternarConsentimento = (valor: boolean) => {
    setConsentimento(valor);
    setMotivos((ms) => (valor ? (ms.includes("saude") ? ms : [...ms, "saude"]) : ms.filter((x) => x !== "saude")));
  };

  const irPara = async (proxima: number) => {
    setErro(null);
    if (etapa === 1 && proxima > 1 && motivos.length === 0) {
      setErro("Selecione ao menos um motivo para continuar ou use “Prefiro não responder”.");
      return;
    }
    let destino = proxima;
    // Sem perguntas de contexto para os motivos marcados, a etapa 2 é pulada.
    if (destino === 2 && contexto.length === 0) destino = proxima > etapa ? 3 : 1;
    ultimo.current = { ...ultimo.current, etapa: destino };
    setEtapa(destino);
    await salvar();
    document.getElementById("questionario-titulo")?.focus();
  };

  const enviar = () =>
    startEnvio(async () => {
      if (pendente.current) await salvar();
      const r = await enviarQuestionario(dados.id);
      if (r.ok) router.replace("/situacao-academica?questionario=enviado");
      else setErro(r.message);
    });

  const recusar = () =>
    startEnvio(async () => {
      const r = await recusarQuestionario(dados.id);
      if (r.ok) router.replace("/situacao-academica?questionario=recusado");
      else setErro(r.message);
    });

  const rotuloOpcao = (p: Pergunta, valor: string | null | undefined) =>
    p.opcoes?.find((o) => o.valor === valor)?.rotulo ?? valor ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-5 font-semibold text-muted">
            Etapa {etapa} de {ETAPAS.length}: {ETAPAS[etapa - 1]}
          </p>
          <p className="text-[13px] leading-5 text-muted" role="status" aria-live="polite">
            {salvando ? "Salvando…" : salvoEm ? `Progresso salvo às ${horaCurta(salvoEm)}` : "Seu progresso é salvo automaticamente"}
          </p>
        </div>
        <ol className="flex gap-1.5" aria-hidden>
          {ETAPAS.map((nome, i) => (
            <li key={nome} className={cn("h-1.5 flex-1 rounded-full", i < etapa ? "bg-primary" : "bg-line")} />
          ))}
        </ol>
      </div>

      <section aria-labelledby="questionario-titulo" className="flex flex-col gap-5">
        {etapa === 1 && (
          <fieldset className="flex flex-col gap-4">
            <legend id="questionario-titulo" tabIndex={-1} className="mb-1 text-lg leading-7 font-bold">
              Qual é o principal motivo para você considerar sair ou trancar o curso?
            </legend>
            <p className="text-[13px] leading-5 text-muted">Você pode marcar mais de uma opção.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MOTIVOS.map((m) => {
                const marcado = m === "saude" ? querSaude : motivos.includes(m);
                return (
                  <label
                    key={m}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 py-2",
                      marcado ? "border-primary bg-tint" : "border-line hover:border-line-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-primary"
                      checked={marcado}
                      onChange={(e) => alternarMotivo(m, e.target.checked)}
                    />
                    <span>{MOTIVO[m]}</span>
                  </label>
                );
              })}
            </div>

            {querSaude && (
              <div className="flex flex-col gap-2 rounded-card border border-line bg-canvas p-4">
                <p className="font-semibold">Informações de saúde têm proteção especial</p>
                <p className="text-[13px] leading-5 text-body">
                  Para registrar este motivo, precisamos do seu consentimento específico. Ninguém da instituição verá esta
                  resposta individualmente: ela entra apenas nos totais. Você pode retirar o consentimento enquanto o
                  questionário estiver aberto, e as informações de saúde serão apagadas.
                </p>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={consentimento}
                    onChange={(e) => alternarConsentimento(e.target.checked)}
                  />
                  <span className="text-[13px] leading-5 font-semibold">
                    Autorizo o registro de informações sobre a minha saúde para esta finalidade.
                  </span>
                </label>
              </div>
            )}

            {motivos.includes("outro") && (
              <CampoTexto pergunta={PERGUNTA_OUTRO} valor={respostas[PERGUNTA_OUTRO.id] ?? ""} onChange={responder} />
            )}
          </fieldset>
        )}

        {etapa === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 id="questionario-titulo" tabIndex={-1} className="text-lg leading-7 font-bold">
                Conte um pouco mais
              </h2>
              <p className="text-[13px] leading-5 text-muted">Todas as perguntas são opcionais. Pule as que preferir.</p>
            </div>
            {contexto.map((grupo) => (
              <fieldset key={grupo.motivo} className="flex flex-col gap-4 rounded-card border border-line p-4">
                <legend className="px-1 text-[13px] leading-5 font-bold text-primary">{MOTIVO[grupo.motivo]}</legend>
                {grupo.perguntas.map((p) =>
                  p.tipo === "texto" ? (
                    <CampoTexto key={p.id} pergunta={p} valor={respostas[p.id] ?? ""} onChange={responder} />
                  ) : (
                    <CampoEscolha key={p.id} pergunta={p} valor={respostas[p.id] ?? null} onChange={responder} />
                  ),
                )}
              </fieldset>
            ))}
          </div>
        )}

        {etapa === 3 && (
          <div className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-3">
              <legend id="questionario-titulo" tabIndex={-1} className="mb-1 text-lg leading-7 font-bold">
                Você reconsideraria sua decisão se a instituição pudesse oferecer o apoio adequado?
              </legend>
              <div className="flex flex-wrap gap-2">
                {RECONSIDERACOES.map((r) => (
                  <label
                    key={r.valor}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-4",
                      reconsideraria === r.valor ? "border-primary bg-tint" : "border-line hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="reconsideraria"
                      className="accent-primary"
                      checked={reconsideraria === r.valor}
                      onChange={() => setReconsideraria(r.valor)}
                    />
                    {r.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            {(reconsideraria === "sim" || reconsideraria === "talvez") &&
              (dados.servicos.length === 0 ? (
                <p className="text-[13px] leading-5 text-muted">
                  A instituição ainda não cadastrou serviços de apoio. Você pode falar com a coordenação do seu curso.
                </p>
              ) : (
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-1 font-bold">Quais destes apoios oferecidos pela instituição interessam a você?</legend>
                  <p className="text-[13px] leading-5 text-muted">
                    Ao enviar, a equipe responsável recebe um pedido de contato para cada apoio marcado.
                  </p>
                  {dados.servicos.map((s) => (
                    <label
                      key={s.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-control border p-3",
                        servicos.includes(s.id) ? "border-primary bg-tint" : "border-line hover:border-line-strong",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-primary"
                        checked={servicos.includes(s.id)}
                        onChange={(e) =>
                          setServicos((atual) => (e.target.checked ? [...atual, s.id] : atual.filter((x) => x !== s.id)))
                        }
                      />
                      <span>
                        <span className="block font-semibold">{s.nome}</span>
                        <span className="block text-[13px] leading-5 text-body">{s.descricao}</span>
                        {s.contato && <span className="block text-[13px] leading-5 text-muted">{s.contato}</span>}
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
          </div>
        )}

        {etapa === 4 && (
          <div className="flex flex-col gap-3">
            <h2 id="questionario-titulo" tabIndex={-1} className="text-lg leading-7 font-bold">
              Comentários finais
            </h2>
            <CampoTexto pergunta={PERGUNTA_COMENTARIO} valor={respostas[PERGUNTA_COMENTARIO.id] ?? ""} onChange={responder} />
          </div>
        )}

        {etapa === 5 && (
          <div className="flex flex-col gap-5">
            <h2 id="questionario-titulo" tabIndex={-1} className="text-lg leading-7 font-bold">
              Revise suas respostas
            </h2>
            <dl className="flex flex-col divide-y divide-line rounded-card border border-line">
              <Resumo titulo="Motivos" onEditar={() => void irPara(1)}>
                {motivos.length ? motivos.map((m) => MOTIVO[m]).join(", ") : "Nenhum"}
                {respostas[PERGUNTA_OUTRO.id] ? ` (${respostas[PERGUNTA_OUTRO.id]})` : ""}
              </Resumo>
              {contexto.length > 0 && (
                <Resumo titulo="Contexto" onEditar={() => void irPara(2)}>
                  {contexto.flatMap((g) => g.perguntas).filter((p) => respostas[p.id]).length === 0 ? (
                    "Sem respostas"
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {contexto
                        .flatMap((g) => g.perguntas)
                        .filter((p) => respostas[p.id])
                        .map((p) => (
                          <li key={p.id}>
                            {p.texto} <span className="font-semibold">{rotuloOpcao(p, respostas[p.id])}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </Resumo>
              )}
              <Resumo titulo="Reconsideraria com apoio" onEditar={() => void irPara(3)}>
                {RECONSIDERACOES.find((r) => r.valor === reconsideraria)?.rotulo ?? "Sem resposta"}
                {servicos.length > 0 &&
                  `. Apoios: ${dados.servicos.filter((s) => servicos.includes(s.id)).map((s) => s.nome).join(", ")}`}
              </Resumo>
              <Resumo titulo="Comentários" onEditar={() => void irPara(4)}>
                {respostas[PERGUNTA_COMENTARIO.id] || "Sem comentários"}
              </Resumo>
            </dl>

            <div className="flex flex-col gap-3 rounded-card bg-canvas p-4 text-[13px] leading-5 text-body">
              <p>
                <span className="font-semibold text-navy">Como suas respostas são usadas.</span> A instituição usa este
                questionário para entender por que estudantes saem e para oferecer apoio. Responder ou não, e o que você
                responder, não muda o seu pedido, suas notas ou qualquer decisão acadêmica.
              </p>
              <p>
                Respostas individuais só são vistas por pessoas autorizadas da equipe de apoio. Informações de saúde nunca
                aparecem individualmente. Relatórios mostram apenas totais de grupos com pelo menos 5 respostas.
              </p>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-navy">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-primary"
                  checked={ciente}
                  onChange={(e) => setCiente(e.target.checked)}
                />
                Li e entendi como minhas respostas serão usadas.
              </label>
            </div>
          </div>
        )}
      </section>

      {erro && <FormMessage tone="error">{erro}</FormMessage>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex gap-3">
          {etapa > 1 && (
            <Button variant="secondary" onClick={() => void irPara(etapa - 1)} disabled={enviando}>
              Voltar
            </Button>
          )}
          {etapa < ETAPAS.length ? (
            <Button onClick={() => void irPara(etapa + 1)} disabled={enviando}>
              Continuar
            </Button>
          ) : (
            <Button onClick={enviar} pending={enviando} disabled={!ciente || motivos.length === 0}>
              {enviando ? "Enviando…" : "Enviar respostas"}
            </Button>
          )}
        </div>

        {!confirmarRecusa ? (
          <Button variant="ghost" onClick={() => setConfirmarRecusa(true)} disabled={enviando}>
            Prefiro não responder
          </Button>
        ) : (
          <div role="group" aria-label="Confirmar que prefere não responder" className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] leading-5 text-body">As respostas salvas serão descartadas. Confirmar?</span>
            <Button size="sm" variant="secondary" onClick={recusar} pending={enviando}>
              Sim, não quero responder
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmarRecusa(false)}>
              Voltar ao questionário
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CampoEscolha({
  pergunta,
  valor,
  onChange,
}: {
  pergunta: Pergunta;
  valor: string | null;
  onChange: (id: string, valor: string | null) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[15px] leading-6 font-semibold">
        {pergunta.texto} <span className="text-[13px] font-normal text-muted">(opcional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {pergunta.opcoes?.map((o) => (
          <label
            key={o.valor}
            className={cn(
              "flex min-h-10 cursor-pointer items-center gap-2 rounded-control border px-3",
              valor === o.valor ? "border-primary bg-tint" : "border-line hover:border-line-strong",
            )}
          >
            <input
              type="radio"
              name={pergunta.id}
              className="accent-primary"
              checked={valor === o.valor}
              onChange={() => onChange(pergunta.id, o.valor)}
            />
            <span className="text-[13px] leading-5">{o.rotulo}</span>
          </label>
        ))}
        {valor && (
          <button
            type="button"
            onClick={() => onChange(pergunta.id, null)}
            className="min-h-10 px-2 text-[13px] leading-5 font-semibold text-primary hover:text-primary-hover"
          >
            Limpar
          </button>
        )}
      </div>
    </fieldset>
  );
}

function CampoTexto({
  pergunta,
  valor,
  onChange,
}: {
  pergunta: Pergunta;
  valor: string;
  onChange: (id: string, valor: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`q-${pergunta.id}`} className="text-[15px] leading-6 font-semibold">
        {pergunta.texto} <span className="text-[13px] font-normal text-muted">(opcional)</span>
      </label>
      <Textarea
        id={`q-${pergunta.id}`}
        rows={4}
        maxLength={LIMITE_TEXTO}
        value={valor}
        onChange={(e) => onChange(pergunta.id, e.target.value || null)}
        aria-describedby={`q-${pergunta.id}-contador`}
      />
      <span id={`q-${pergunta.id}-contador`} className="self-end text-xs leading-4 text-muted">
        {valor.length} de {LIMITE_TEXTO} caracteres
      </span>
    </div>
  );
}

function Resumo({ titulo, onEditar, children }: { titulo: string; onEditar: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <dt className="label-caps text-muted">{titulo}</dt>
        <dd className="mt-1 text-body">{children}</dd>
      </div>
      <button
        type="button"
        onClick={onEditar}
        className="min-h-9 self-start text-[13px] leading-5 font-semibold text-primary hover:text-primary-hover"
      >
        Editar
      </button>
    </div>
  );
}
