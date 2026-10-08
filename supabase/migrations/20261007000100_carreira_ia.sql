-- KairusEdu: carreira e estágio, competências, currículo, inteligência do modelo e uso de IA.

create type public.nivel_competencia as enum ('tem', 'desenvolvendo');
create type public.status_candidatura as enum ('enviada', 'em_analise', 'encerrada');

-- ---------------------------------------------------------------------------
-- Competências
-- ---------------------------------------------------------------------------
create table public.competencias (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (instituicao_id, nome),
  unique (id, instituicao_id)
);

-- Competências reconhecidas a partir de disciplinas e atividades concluídas.
create table public.estudante_competencias (
  estudante_id uuid not null,
  competencia_id uuid not null,
  instituicao_id uuid not null,
  nivel public.nivel_competencia not null,
  progresso smallint not null default 0 check (progresso between 0 and 100),
  origem text check (char_length(origem) <= 160),
  created_at timestamptz not null default now(),
  primary key (estudante_id, competencia_id),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade,
  foreign key (competencia_id, instituicao_id) references public.competencias (id, instituicao_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Empresas, vagas e candidaturas
-- ---------------------------------------------------------------------------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 160),
  setor text not null check (char_length(setor) <= 80),
  areas text not null check (char_length(areas) <= 200),
  cidade text not null check (char_length(cidade) <= 80),
  distancia_campus_km smallint check (distancia_campus_km >= 0),
  created_at timestamptz not null default now(),
  unique (instituicao_id, nome),
  unique (id, instituicao_id)
);

create table public.vagas (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  empresa_id uuid not null,
  curso_id uuid not null,
  titulo text not null check (char_length(titulo) between 3 and 160),
  descricao text not null check (char_length(descricao) <= 2000),
  cidade text not null check (char_length(cidade) <= 80),
  periodo_minimo smallint not null default 1 check (periodo_minimo between 1 and 12),
  carga_horaria text not null check (char_length(carga_horaria) <= 60),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, instituicao_id),
  foreign key (empresa_id, instituicao_id) references public.empresas (id, instituicao_id) on delete cascade,
  foreign key (curso_id, instituicao_id) references public.cursos (id, instituicao_id) on delete cascade
);
create index vagas_curso_idx on public.vagas (curso_id, ativa);

create table public.vaga_competencias (
  vaga_id uuid not null,
  competencia_id uuid not null,
  instituicao_id uuid not null,
  primary key (vaga_id, competencia_id),
  foreign key (vaga_id, instituicao_id) references public.vagas (id, instituicao_id) on delete cascade,
  foreign key (competencia_id, instituicao_id) references public.competencias (id, instituicao_id) on delete cascade
);

create table public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  vaga_id uuid not null,
  estudante_id uuid not null,
  status public.status_candidatura not null default 'enviada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vaga_id, estudante_id),
  foreign key (vaga_id, instituicao_id) references public.vagas (id, instituicao_id) on delete cascade,
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index candidaturas_estudante_idx on public.candidaturas (estudante_id);

-- ---------------------------------------------------------------------------
-- Trilhas
-- ---------------------------------------------------------------------------
-- Etapas da trilha de carreira por curso; o status de cada etapa deriva do período do estudante.
create table public.trilha_carreira_etapas (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  curso_id uuid not null,
  periodo smallint not null check (periodo between 1 and 12),
  titulo text not null check (char_length(titulo) <= 80),
  descricao text not null check (char_length(descricao) <= 300),
  entrega text not null check (char_length(entrega) <= 120),
  unique (curso_id, periodo),
  foreign key (curso_id, instituicao_id) references public.cursos (id, instituicao_id) on delete cascade
);

create table public.areas_atuacao (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  curso_id uuid not null,
  nome text not null check (char_length(nome) <= 80),
  descricao text not null check (char_length(descricao) <= 400),
  ordem smallint not null default 0,
  unique (curso_id, nome),
  unique (id, instituicao_id),
  foreign key (curso_id, instituicao_id) references public.cursos (id, instituicao_id) on delete cascade
);

create table public.area_passos (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  area_id uuid not null,
  ordem smallint not null,
  titulo text not null check (char_length(titulo) <= 80),
  descricao text not null check (char_length(descricao) <= 300),
  unique (area_id, ordem),
  foreign key (area_id, instituicao_id) references public.areas_atuacao (id, instituicao_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Currículo do estudante (privado: só o próprio estudante lê e escreve)
-- ---------------------------------------------------------------------------
create table public.curriculos (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  estudante_id uuid not null unique,
  resumo text check (char_length(resumo) <= 1500),
  competencias_texto text check (char_length(competencias_texto) <= 1500),
  curriculo_gerado_em timestamptz,
  vivencias text check (char_length(vivencias) <= 3000),
  -- [{ "competencia": text, "origem": text }]
  competencias_vivencias jsonb not null default '[]'::jsonb check (jsonb_typeof(competencias_vivencias) = 'array'),
  experiencia_texto text check (char_length(experiencia_texto) <= 1500),
  vivencias_geradas_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Métricas do modelo de risco (produzidas fora da aplicação)
-- ---------------------------------------------------------------------------
create table public.metricas_modelo (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete cascade,
  modelo_versao text not null,
  momento text not null check (momento in ('matricula', 'quatro_semanas')),
  auc numeric(4,3) not null check (auc between 0 and 1),
  captura_top20 numeric(5,2) check (captura_top20 between 0 and 100),
  periodo_treino text not null,
  periodo_teste text not null,
  base_simulada boolean not null default false,
  created_at timestamptz not null default now(),
  unique (instituicao_id, modelo_versao, momento)
);

-- ---------------------------------------------------------------------------
-- Uso de IA: limite diário, custo e rastreabilidade (sem conteúdo enviado ao modelo)
-- ---------------------------------------------------------------------------
create table public.ia_uso (
  id bigint generated always as identity primary key,
  instituicao_id uuid not null references public.instituicoes (id) on delete cascade,
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  funcao text not null check (funcao in ('vivencias', 'curriculo', 'insights')),
  modelo text not null,
  sucesso boolean not null,
  tokens_entrada int,
  tokens_saida int,
  custo_usd numeric(10,6),
  criado_em timestamptz not null default now()
);
create index ia_uso_perfil_idx on public.ia_uso (perfil_id, funcao, criado_em desc);

-- Insights podem ser curados ou gerados por IA a partir de agregados.
alter table public.insights
  add column origem text not null default 'curado' check (origem in ('curado', 'ia')),
  add column gerado_em timestamptz;

-- ---------------------------------------------------------------------------
-- Integridade
-- ---------------------------------------------------------------------------
create function private.validar_candidatura()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_vaga record;
  v_periodo smallint;
begin
  select v.ativa, v.periodo_minimo into v_vaga from public.vagas v where v.id = new.vaga_id;
  if not found or not v_vaga.ativa then
    raise exception 'Esta vaga não está mais aberta.' using errcode = '23514';
  end if;
  select e.periodo_atual into v_periodo from public.estudantes e where e.id = new.estudante_id;
  if v_periodo < v_vaga.periodo_minimo then
    raise exception 'A vaga pede um período mais avançado.' using errcode = '23514';
  end if;
  new.status := 'enviada';
  return new;
end;
$$;
create trigger validar_candidatura before insert on public.candidaturas
  for each row execute function private.validar_candidatura();

create trigger set_updated_at before update on public.vagas for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.candidaturas for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.curriculos for each row execute function private.set_updated_at();

create function private.preparar_curriculo()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.estudante_id := old.estudante_id;
  new.instituicao_id := old.instituicao_id;
  new.created_at := old.created_at;
  return new;
end;
$$;
create trigger preparar_curriculo before update on public.curriculos
  for each row execute function private.preparar_curriculo();

create trigger auditar_candidaturas after insert or update on public.candidaturas
  for each row execute function private.auditar_alteracao();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.competencias enable row level security;
alter table public.estudante_competencias enable row level security;
alter table public.empresas enable row level security;
alter table public.vagas enable row level security;
alter table public.vaga_competencias enable row level security;
alter table public.candidaturas enable row level security;
alter table public.trilha_carreira_etapas enable row level security;
alter table public.areas_atuacao enable row level security;
alter table public.area_passos enable row level security;
alter table public.curriculos enable row level security;
alter table public.metricas_modelo enable row level security;
alter table public.ia_uso enable row level security;

-- Catálogos da instituição: leitura para qualquer usuário autenticado da mesma instituição.
create policy "competências: instituição" on public.competencias
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));
create policy "empresas: instituição" on public.empresas
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));
create policy "vagas: instituição" on public.vagas
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));
create policy "vaga_competencias: instituição" on public.vaga_competencias
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));
create policy "trilha: instituição" on public.trilha_carreira_etapas
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));
create policy "áreas: instituição" on public.areas_atuacao
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));
create policy "passos: instituição" on public.area_passos
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));

create policy "competências do estudante: estudantes visíveis" on public.estudante_competencias
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "candidaturas: estudante ou equipe lê" on public.candidaturas
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and estudante_id in (select e.id from public.estudantes e)
  );
create policy "candidaturas: estudante envia" on public.candidaturas
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.papel_atual()) = 'estudante'
    and estudante_id = (select private.estudante_atual())
  );

-- Currículo: somente o próprio estudante.
create policy "currículo: próprio lê" on public.curriculos
  for select to authenticated using (estudante_id = (select private.estudante_atual()));
create policy "currículo: próprio cria" on public.curriculos
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and estudante_id = (select private.estudante_atual())
  );
create policy "currículo: próprio atualiza" on public.curriculos
  for update to authenticated
  using (estudante_id = (select private.estudante_atual()))
  with check (estudante_id = (select private.estudante_atual()));

create policy "métricas: equipe" on public.metricas_modelo
  for select to authenticated
  using (instituicao_id = (select private.instituicao_atual()) and (select private.e_equipe()));

create policy "uso de IA: próprio ou gestor lê" on public.ia_uso
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (perfil_id = (select auth.uid()) or (select private.papel_atual()) = 'gestor')
  );
create policy "uso de IA: próprio registra" on public.ia_uso
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and perfil_id = (select auth.uid())
  );

create policy "insights: gestor registra os gerados por IA" on public.insights
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.papel_atual()) = 'gestor'
    and origem = 'ia'
  );
create policy "insights: gestor substitui os gerados por IA" on public.insights
  for delete to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.papel_atual()) = 'gestor'
    and origem = 'ia'
  );

-- ---------------------------------------------------------------------------
-- Fatores associados à evasão no período corrente (agregado; somente gestão)
-- ---------------------------------------------------------------------------
create function public.painel_fatores()
returns table (fator text, alunos int, peso_medio numeric)
language plpgsql stable security invoker
set search_path = ''
as $$
begin
  if private.papel_atual() is distinct from 'gestor' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
  select f.value ->> 'fator', count(*)::int, round(avg((f.value ->> 'peso')::numeric), 3)
    from public.avaliacoes_risco r
    cross join lateral jsonb_array_elements(r.fatores) f
   where r.periodo_letivo_id = private.periodo_corrente() and r.faixa <> 'baixo'
   group by 1
  having count(*) >= 5
   order by count(*) * avg((f.value ->> 'peso')::numeric) desc;
end;
$$;

-- Contagem de usos de IA nas últimas 24 horas pelo próprio usuário (limite diário).
create function public.ia_usos_hoje(p_funcao text)
returns int
language sql stable security invoker
set search_path = ''
as $$
  select count(*)::int from public.ia_uso u
   where u.perfil_id = auth.uid() and u.funcao = p_funcao and u.criado_em > now() - interval '24 hours'
$$;

revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.painel_fatores(), public.ia_usos_hoje(text) to authenticated;
