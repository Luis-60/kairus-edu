import type { Database } from "@/types/database";

/**
 * Catálogo versionado do questionário de desligamento. Usado pela tela (renderização) e pelo
 * servidor (validação). Ao mudar perguntas, crie uma nova versão para não misturar respostas.
 */
export const VERSAO_QUESTIONARIO = "2026.2";

export type Motivo = Database["public"]["Enums"]["motivo_desligamento"];
export type Reconsideracao = Database["public"]["Enums"]["resposta_reconsideracao"];

export type Opcao = { valor: string; rotulo: string };

export type Pergunta = {
  id: string;
  texto: string;
  tipo: "unica" | "texto";
  opcoes?: Opcao[];
  /** Resposta sobre saúde: exige consentimento específico e nunca é exibida individualmente. */
  saude?: boolean;
};

const SIM_TALVEZ_NAO: Opcao[] = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "talvez", rotulo: "Talvez" },
  { valor: "nao", rotulo: "Não" },
];
const SIM_NAO: Opcao[] = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
];

/** Ordem de exibição dos motivos na etapa 1. */
export const MOTIVOS: Motivo[] = [
  "financeira",
  "trabalho_estudo",
  "deslocamento",
  "acesso_internet_equipamento",
  "dificuldade_conteudo",
  "insatisfacao_curso",
  "identificacao_carreira",
  "pessoal_familiar",
  "saude",
  "adaptacao_curso",
  "falta_oportunidades",
  "outro",
];

/** Perguntas de contexto exibidas conforme os motivos marcados. Todas são opcionais. */
export const PERGUNTAS_POR_MOTIVO: Partial<Record<Motivo, Pergunta[]>> = {
  financeira: [
    {
      id: "fin_mensalidade",
      texto: "As mensalidades estão afetando sua capacidade de continuar estudando?",
      tipo: "unica",
      opcoes: [
        { valor: "sim", rotulo: "Sim" },
        { valor: "em_parte", rotulo: "Em parte" },
        { valor: "nao", rotulo: "Não" },
      ],
    },
    {
      id: "fin_bolsa",
      texto: "Você já pensou em pedir uma bolsa?",
      tipo: "unica",
      opcoes: [
        { valor: "ja_pedi", rotulo: "Já pedi" },
        { valor: "pensei", rotulo: "Pensei, mas não pedi" },
        { valor: "nao", rotulo: "Não" },
      ],
    },
    { id: "fin_plano", texto: "Um plano de pagamento ajudaria você a continuar?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
    { id: "fin_trabalha", texto: "Você trabalha atualmente?", tipo: "unica", opcoes: SIM_NAO },
    {
      id: "fin_info",
      texto: "Quer receber informações sobre o apoio financeiro disponível?",
      tipo: "unica",
      opcoes: SIM_NAO,
    },
  ],
  trabalho_estudo: [
    {
      id: "trab_horas",
      texto: "Quantas horas por semana você trabalha?",
      tipo: "unica",
      opcoes: [
        { valor: "ate_20", rotulo: "Até 20 horas" },
        { valor: "21_30", rotulo: "De 21 a 30 horas" },
        { valor: "31_40", rotulo: "De 31 a 40 horas" },
        { valor: "mais_40", rotulo: "Mais de 40 horas" },
      ],
    },
    {
      id: "trab_conflito",
      texto: "O horário do trabalho conflita com as aulas?",
      tipo: "unica",
      opcoes: [
        { valor: "sim", rotulo: "Sim" },
        { valor: "as_vezes", rotulo: "Às vezes" },
        { valor: "nao", rotulo: "Não" },
      ],
    },
    { id: "trab_turno", texto: "Um turno de aulas diferente ajudaria?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
    { id: "trab_online", texto: "Mais disciplinas a distância ajudariam?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
  ],
  deslocamento: [
    {
      id: "desl_tempo",
      texto: "Quanto tempo você leva para chegar ao campus?",
      tipo: "unica",
      opcoes: [
        { valor: "ate_30", rotulo: "Até 30 minutos" },
        { valor: "30_60", rotulo: "De 30 minutos a 1 hora" },
        { valor: "60_120", rotulo: "De 1 a 2 horas" },
        { valor: "mais_120", rotulo: "Mais de 2 horas" },
      ],
    },
    { id: "desl_online", texto: "Mais disciplinas a distância ajudariam?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
  ],
  acesso_internet_equipamento: [
    {
      id: "acesso_falta",
      texto: "O que está faltando?",
      tipo: "unica",
      opcoes: [
        { valor: "computador", rotulo: "Computador" },
        { valor: "internet", rotulo: "Internet" },
        { valor: "ambos", rotulo: "Os dois" },
      ],
    },
    { id: "acesso_emprestimo", texto: "O empréstimo de um equipamento ajudaria?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
  ],
  dificuldade_conteudo: [
    { id: "acad_disciplinas", texto: "Quais disciplinas têm sido mais difíceis?", tipo: "texto" },
    { id: "acad_buscou", texto: "Você já procurou apoio acadêmico?", tipo: "unica", opcoes: SIM_NAO },
    { id: "acad_tutoria", texto: "Monitoria ou tutoria ajudaria?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
  ],
  insatisfacao_curso: [
    { id: "curso_troca", texto: "Você consideraria trocar de curso dentro da instituição?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
  ],
  identificacao_carreira: [
    { id: "carreira_orientacao", texto: "Uma orientação de carreira ajudaria você a decidir?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
  ],
  saude: [
    {
      id: "saude_contato",
      texto: "Gostaria de ser contatado pelo atendimento de saúde ou psicológico da instituição?",
      tipo: "unica",
      opcoes: SIM_NAO,
      saude: true,
    },
  ],
  adaptacao_curso: [
    { id: "adapt_acolhimento", texto: "Um acompanhamento de acolhimento ajudaria?", tipo: "unica", opcoes: SIM_TALVEZ_NAO },
  ],
  falta_oportunidades: [
    {
      id: "oport_estagio",
      texto: "Vagas de estágio ou emprego na sua área ajudariam você a continuar?",
      tipo: "unica",
      opcoes: SIM_TALVEZ_NAO,
    },
  ],
};

/** Perguntas fora do contexto dos motivos. */
export const PERGUNTA_OUTRO: Pergunta = { id: "motivo_outro_texto", texto: "Conte qual é o outro motivo", tipo: "texto" };
export const PERGUNTA_COMENTARIO: Pergunta = {
  id: "comentario_final",
  texto: "Há algo mais que você gostaria que a instituição soubesse sobre a sua experiência?",
  tipo: "texto",
};
export const PERGUNTA_SERVICOS = "servicos_interesse";

export const RECONSIDERACOES: { valor: Reconsideracao; rotulo: string }[] = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "talvez", rotulo: "Talvez" },
  { valor: "nao", rotulo: "Não" },
  { valor: "prefiro_nao_responder", rotulo: "Prefiro não responder" },
];

export const ETAPAS = ["Motivos", "Contexto", "Apoio", "Comentários", "Revisão"] as const;

export const LIMITE_TEXTO = 1000;

const PERGUNTAS: Map<string, Pergunta & { motivo?: Motivo }> = new Map([
  ...Object.entries(PERGUNTAS_POR_MOTIVO).flatMap(([motivo, perguntas]) =>
    (perguntas ?? []).map((p) => [p.id, { ...p, motivo: motivo as Motivo }] as const),
  ),
  [PERGUNTA_OUTRO.id, { ...PERGUNTA_OUTRO, motivo: "outro" as Motivo }],
  [PERGUNTA_COMENTARIO.id, PERGUNTA_COMENTARIO],
]);

export function perguntaPorId(id: string) {
  return PERGUNTAS.get(id);
}

/** Valida uma resposta do catálogo. Retorna o valor normalizado ou null quando inválida. */
export function normalizarResposta(id: string, valor: unknown): string | null {
  const pergunta = PERGUNTAS.get(id);
  if (!pergunta || typeof valor !== "string") return null;
  if (pergunta.tipo === "texto") {
    const texto = valor.trim();
    return texto.length > 0 && texto.length <= LIMITE_TEXTO ? texto : null;
  }
  return pergunta.opcoes?.some((o) => o.valor === valor) ? valor : null;
}

/** Perguntas de contexto visíveis para os motivos marcados. */
export function perguntasDeContexto(motivos: Motivo[]) {
  return MOTIVOS.filter((m) => motivos.includes(m) && PERGUNTAS_POR_MOTIVO[m]?.length).map((m) => ({
    motivo: m,
    perguntas: PERGUNTAS_POR_MOTIVO[m] ?? [],
  }));
}
