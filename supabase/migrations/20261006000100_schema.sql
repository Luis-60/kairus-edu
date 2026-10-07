-- KairusEdu: schema base
-- Instituição é a fronteira de acesso. Toda tabela de domínio carrega instituicao_id e
-- usa FKs compostas (id, instituicao_id) para impedir vínculos entre instituições diferentes.

create extension if not exists pgcrypto with schema extensions;

-- Funções auxiliares de autorização ficam fora do schema exposto pela API.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.papel_usuario as enum ('gestor', 'coordenador', 'estudante');
create type public.modalidade_curso as enum ('presencial', 'ead');
create type public.situacao_estudante as enum ('ativo', 'trancado', 'cancelado', 'evadido', 'formado');
create type public.faixa_risco as enum ('baixo', 'atencao', 'alto');
create type public.tipo_acao as enum (
  'conversa_individual', 'tutoria', 'apoio_financeiro', 'monitoria', 'ajuste_grade', 'outro'
);
create type public.status_acao as enum ('pendente', 'em_andamento', 'concluida', 'cancelada');
create type public.tipo_desligamento as enum ('trancamento', 'cancelamento');
create type public.status_pedido as enum ('aberto', 'concluido', 'revertido');
create type public.motivo_desligamento as enum (
  'acesso_internet_equipamento', 'financeira', 'trabalho_estudo', 'deslocamento',
  'dificuldade_conteudo', 'adaptacao_curso', 'outro'
);
create type public.assunto_apoio as enum ('frequencia', 'financeiro', 'grade', 'trancamento', 'outro');
create type public.status_solicitacao as enum ('aberta', 'em_atendimento', 'encerrada');

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Instituições e usuários
-- ---------------------------------------------------------------------------
create table public.instituicoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 160),
  sigla text check (char_length(sigla) <= 20),
  frequencia_minima numeric(5,2) not null default 75 check (frequencia_minima between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  instituicao_id uuid not null references public.instituicoes (id) on delete restrict,
  papel public.papel_usuario not null,
  nome text not null check (char_length(nome) between 2 and 160),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, instituicao_id)
);
create index perfis_instituicao_papel_idx on public.perfis (instituicao_id, papel);

-- ---------------------------------------------------------------------------
-- Estrutura acadêmica
-- ---------------------------------------------------------------------------
create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete restrict,
  nome text not null check (char_length(nome) between 2 and 160),
  modalidade public.modalidade_curso not null,
  total_periodos smallint not null check (total_periodos between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instituicao_id, nome),
  unique (id, instituicao_id)
);

create table public.coordenacoes_curso (
  perfil_id uuid not null,
  curso_id uuid not null,
  instituicao_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (perfil_id, curso_id),
  foreign key (perfil_id, instituicao_id) references public.perfis (id, instituicao_id) on delete cascade,
  foreign key (curso_id, instituicao_id) references public.cursos (id, instituicao_id) on delete cascade
);
create index coordenacoes_curso_curso_idx on public.coordenacoes_curso (curso_id);

create table public.periodos_letivos (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete restrict,
  codigo text not null check (codigo ~ '^[0-9]{4}\.[12]$'),
  inicio date not null,
  fim date not null,
  encerrado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim > inicio),
  unique (instituicao_id, codigo),
  unique (id, instituicao_id)
);

-- Estudante identificado por código institucional (pseudônimo). Dados pessoais como CPF,
-- telefone e endereço não são armazenados aqui; o nome fica em perfis, quando há conta.
create table public.estudantes (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete restrict,
  curso_id uuid not null,
  perfil_id uuid unique,
  codigo text not null check (codigo ~ '^[A-Z0-9]{4,12}$'),
  periodo_atual smallint not null check (periodo_atual between 1 and 12),
  situacao public.situacao_estudante not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instituicao_id, codigo),
  unique (id, instituicao_id),
  foreign key (curso_id, instituicao_id) references public.cursos (id, instituicao_id) on delete restrict,
  foreign key (perfil_id, instituicao_id) references public.perfis (id, instituicao_id) on delete set null (perfil_id)
);
create index estudantes_curso_idx on public.estudantes (curso_id, situacao);

-- Situação do estudante em cada período letivo. situacao_final nula = período em andamento.
-- Base do cálculo de evasão: trancado, cancelado ou evadido ao fim do período.
create table public.vinculos_periodo (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  estudante_id uuid not null,
  periodo_letivo_id uuid not null,
  periodo_curso smallint not null check (periodo_curso between 1 and 12),
  situacao_final public.situacao_estudante,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (estudante_id, periodo_letivo_id),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade,
  foreign key (periodo_letivo_id, instituicao_id) references public.periodos_letivos (id, instituicao_id) on delete restrict
);
create index vinculos_periodo_periodo_idx on public.vinculos_periodo (periodo_letivo_id, situacao_final);

create table public.indicadores_academicos (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  estudante_id uuid not null,
  periodo_letivo_id uuid not null,
  frequencia numeric(5,2) check (frequencia between 0 and 100),
  coeficiente numeric(4,2) check (coeficiente between 0 and 10),
  disciplinas smallint check (disciplinas between 0 and 20),
  entregas_atrasadas smallint check (entregas_atrasadas >= 0),
  creditos_concluidos_pct numeric(5,2) check (creditos_concluidos_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (estudante_id, periodo_letivo_id),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade,
  foreign key (periodo_letivo_id, instituicao_id) references public.periodos_letivos (id, instituicao_id) on delete restrict
);

-- ---------------------------------------------------------------------------
-- Risco (produzido por um modelo externo; a aplicação apenas lê)
-- ---------------------------------------------------------------------------
create table public.avaliacoes_risco (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  estudante_id uuid not null,
  periodo_letivo_id uuid not null,
  probabilidade numeric(5,4) not null check (probabilidade between 0 and 1),
  faixa public.faixa_risco not null,
  -- [{ "fator": text, "peso": 0..1 }]
  fatores jsonb not null default '[]'::jsonb check (jsonb_typeof(fatores) = 'array'),
  acao_sugerida text check (char_length(acao_sugerida) <= 160),
  acao_sugerida_descricao text check (char_length(acao_sugerida_descricao) <= 600),
  modelo_versao text not null,
  gerada_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (estudante_id, periodo_letivo_id),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade,
  foreign key (periodo_letivo_id, instituicao_id) references public.periodos_letivos (id, instituicao_id) on delete restrict
);
create index avaliacoes_risco_periodo_faixa_idx on public.avaliacoes_risco (periodo_letivo_id, faixa, probabilidade desc);

-- ---------------------------------------------------------------------------
-- Ações de permanência
-- ---------------------------------------------------------------------------
create table public.acoes_permanencia (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  estudante_id uuid not null,
  tipo public.tipo_acao not null,
  descricao text not null check (char_length(descricao) between 3 and 1000),
  responsavel_id uuid not null,
  prazo date not null,
  status public.status_acao not null default 'pendente',
  criada_por uuid not null default auth.uid(),
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade,
  foreign key (responsavel_id, instituicao_id) references public.perfis (id, instituicao_id) on delete restrict,
  foreign key (criada_por, instituicao_id) references public.perfis (id, instituicao_id) on delete restrict
);
create index acoes_permanencia_estudante_idx on public.acoes_permanencia (estudante_id, created_at desc);
create index acoes_permanencia_status_idx on public.acoes_permanencia (instituicao_id, status, prazo);
create index acoes_permanencia_responsavel_idx on public.acoes_permanencia (responsavel_id);

-- ---------------------------------------------------------------------------
-- Desligamento
-- ---------------------------------------------------------------------------
create table public.pedidos_desligamento (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  estudante_id uuid not null,
  tipo public.tipo_desligamento not null,
  status public.status_pedido not null default 'aberto',
  -- Preenchido na abertura: o modelo havia sinalizado o estudante (atenção ou alto)?
  sinalizado_previamente boolean not null default false,
  aberto_em timestamptz not null default now(),
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, instituicao_id),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index pedidos_desligamento_estudante_idx on public.pedidos_desligamento (estudante_id);
create index pedidos_desligamento_status_idx on public.pedidos_desligamento (instituicao_id, status);

-- Resposta só existe com consentimento. Leitura individual não é exposta; apenas agregados.
create table public.respostas_desligamento (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  pedido_id uuid not null unique,
  motivo_principal public.motivo_desligamento not null,
  comentario text check (char_length(comentario) <= 2000),
  consentimento boolean not null check (consentimento),
  respondida_em timestamptz not null default now(),
  foreign key (pedido_id, instituicao_id) references public.pedidos_desligamento (id, instituicao_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Solicitações de apoio abertas pelo estudante ("Falar com a coordenação")
-- ---------------------------------------------------------------------------
create table public.solicitacoes_apoio (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  estudante_id uuid not null,
  assunto public.assunto_apoio not null,
  mensagem text not null check (char_length(mensagem) between 10 and 1000),
  status public.status_solicitacao not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index solicitacoes_apoio_estudante_idx on public.solicitacoes_apoio (estudante_id, created_at desc);
create index solicitacoes_apoio_status_idx on public.solicitacoes_apoio (instituicao_id, status);

-- ---------------------------------------------------------------------------
-- Insights (texto curado/gerado fora da aplicação, exibido à gestão)
-- ---------------------------------------------------------------------------
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete cascade,
  contexto text not null check (contexto in ('visao_geral', 'inteligencia')),
  categoria text not null check (char_length(categoria) <= 60),
  texto text not null check (char_length(texto) <= 600),
  acao_sugerida text check (char_length(acao_sugerida) <= 600),
  ordem smallint not null default 0,
  created_at timestamptz not null default now()
);
create index insights_contexto_idx on public.insights (instituicao_id, contexto, ordem);

-- ---------------------------------------------------------------------------
-- Auditoria. Detalhes nunca devem conter dados pessoais (apenas ids e campos alterados).
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  instituicao_id uuid not null references public.instituicoes (id) on delete cascade,
  ator_id uuid references auth.users (id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  ocorrido_em timestamptz not null default now()
);
create index audit_log_instituicao_idx on public.audit_log (instituicao_id, ocorrido_em desc);
create index audit_log_entidade_idx on public.audit_log (entidade, entidade_id);

-- ---------------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'instituicoes', 'perfis', 'cursos', 'periodos_letivos', 'estudantes', 'vinculos_periodo',
    'indicadores_academicos', 'acoes_permanencia', 'pedidos_desligamento', 'solicitacoes_apoio'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      t
    );
  end loop;
end;
$$;
