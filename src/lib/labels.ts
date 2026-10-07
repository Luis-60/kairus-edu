import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const MODALIDADE: Record<Enums["modalidade_curso"], string> = {
  ead: "A distância",
  presencial: "Presencial",
};

export const MOTIVO: Record<Enums["motivo_desligamento"], string> = {
  acesso_internet_equipamento: "Acesso a internet ou equipamento",
  financeira: "Financeira",
  trabalho_estudo: "Conciliar trabalho e estudo",
  deslocamento: "Deslocamento",
  dificuldade_conteudo: "Dificuldade com o conteúdo",
  adaptacao_curso: "Adaptação ao curso",
  outro: "Outro motivo",
};

export const TIPO_ACAO: Record<Enums["tipo_acao"], string> = {
  conversa_individual: "Conversa individual",
  tutoria: "Tutoria de acolhimento",
  apoio_financeiro: "Apoio financeiro",
  monitoria: "Monitoria",
  ajuste_grade: "Ajuste de grade",
  outro: "Outra ação",
};

export const STATUS_ACAO: Record<Enums["status_acao"], string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const TIPO_DESLIGAMENTO: Record<Enums["tipo_desligamento"], string> = {
  trancamento: "Trancamento",
  cancelamento: "Cancelamento",
};

export const STATUS_PEDIDO: Record<Enums["status_pedido"], string> = {
  aberto: "Aberto",
  concluido: "Concluído",
  revertido: "Revertido",
};

export const ASSUNTO_APOIO: Record<Enums["assunto_apoio"], string> = {
  frequencia: "Frequência",
  financeiro: "Situação financeira",
  grade: "Ajuste de grade",
  trancamento: "Pensando em trancar",
  outro: "Outro assunto",
};

export const STATUS_SOLICITACAO: Record<Enums["status_solicitacao"], string> = {
  aberta: "Aberta",
  em_atendimento: "Em atendimento",
  encerrada: "Encerrada",
};
