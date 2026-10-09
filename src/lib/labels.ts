import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const MODALIDADE: Record<Enums["modalidade_curso"], string> = {
  ead: "A distância",
  presencial: "Presencial",
};

export const MOTIVO: Record<Enums["motivo_desligamento"], string> = {
  financeira: "Dificuldade financeira",
  trabalho_estudo: "Conciliar trabalho e estudo",
  deslocamento: "Transporte ou deslocamento",
  acesso_internet_equipamento: "Falta de acesso a computador ou internet",
  dificuldade_conteudo: "Dificuldade com o conteúdo",
  insatisfacao_curso: "Insatisfação com o curso",
  identificacao_carreira: "Não se identificar com a carreira",
  pessoal_familiar: "Questões pessoais ou familiares",
  saude: "Saúde física ou mental",
  adaptacao_curso: "Adaptação à vida universitária",
  falta_oportunidades: "Falta de oportunidades profissionais",
  outro: "Outro motivo",
};

export const STATUS_QUESTIONARIO: Record<Enums["status_questionario"], string> = {
  pendente: "Não iniciada",
  em_andamento: "Em andamento",
  enviado: "Respondida",
  recusado: "Preferiu não responder",
  encerrado: "Encerrada sem resposta",
};

export const RECONSIDERACAO: Record<Enums["resposta_reconsideracao"], string> = {
  sim: "Sim",
  talvez: "Talvez",
  nao: "Não",
  prefiro_nao_responder: "Prefiro não responder",
};

export const CATEGORIA_SERVICO: Record<Enums["categoria_servico"], string> = {
  financeiro: "Apoio financeiro",
  academico: "Apoio acadêmico",
  psicologico: "Apoio psicológico",
  carreira: "Orientação de carreira",
  horario: "Flexibilização de horários",
  estagio: "Estágio e emprego",
  outro: "Outro apoio",
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
