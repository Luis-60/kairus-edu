-- KairusEdu: perfil profissional estruturado, competências com evidência e confirmação,
-- versões de currículo (PDF no Storage), análises de vaga e scanner de ATS.
-- Tudo aqui pertence ao estudante: a instituição não lê dados individuais destas tabelas.

create type public.tipo_experiencia as enum (
  'formal', 'estagio', 'freelance', 'negocio_familiar', 'informal', 'voluntario', 'atividade'
);
create type public.categoria_habilidade as enum ('tecnica', 'comportamental');
create type public.origem_habilidade as enum ('aluno', 'ia', 'instituicao');
create type public.status_habilidade as enum ('sugerida', 'confirmada', 'rejeitada');
create type public.nivel_idioma as enum ('basico', 'intermediario', 'avancado', 'fluente', 'nativo');
create type public.modelo_curriculo as enum ('classico', 'compacto');

-- Função de propriedade usada pelas políticas das tabelas do estudante.
create function private.e_do_estudante(p_estudante uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_estudante is not null and p_estudante = private.estudante_atual()
$$;
revoke execute on function private.e_do_estudante(uuid) from public, anon;
grant execute on function private.e_do_estudante(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Perfil profissional (contato fica aqui, visível apenas ao próprio estudante)
-- ---------------------------------------------------------------------------
create table public.perfis_profissionais (
  estudante_id uuid primary key,
  instituicao_id uuid not null,
  tipo_vaga text check (tipo_vaga in ('estagio', 'emprego', 'trainee', 'aprendiz')),
  area_interesse text check (char_length(area_interesse) <= 120),
  objetivo text check (char_length(objetivo) <= 600),
  email_contato text check (char_length(email_contato) <= 254),
  telefone text check (char_length(telefone) <= 30),
  cidade text check (char_length(cidade) <= 80),
  linkedin text check (char_length(linkedin) <= 200),
  portfolio text check (char_length(portfolio) <= 200),
  disciplinas_relevantes text check (char_length(disciplinas_relevantes) <= 600),
  conquistas_academicas text check (char_length(conquistas_academicas) <= 800),
  sem_experiencia boolean not null default false,
  etapa_atual smallint not null default 1 check (etapa_atual between 1 and 10),
  -- Rascunho do currículo em edição (conteúdo estruturado, validado pela aplicação).
  rascunho jsonb check (rascunho is null or jsonb_typeof(rascunho) = 'object'),
  rascunho_gerado_em timestamptz,
  -- Perguntas de acompanhamento sugeridas pela IA: [{ "item_id": uuid, "pergunta": text }]
  perguntas_ia jsonb not null default '[]'::jsonb check (jsonb_typeof(perguntas_ia) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);

create table public.experiencias (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  tipo public.tipo_experiencia not null,
  organizacao text check (char_length(organizacao) <= 160),
  cargo text not null check (char_length(cargo) between 2 and 120),
  inicio date,
  fim date,
  atual boolean not null default false,
  atividades text not null check (char_length(atividades) between 10 and 2000),
  ferramentas text check (char_length(ferramentas) <= 400),
  resultados text check (char_length(resultados) <= 800),
  ordem smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim is null or inicio is null or fim >= inicio),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index experiencias_estudante_idx on public.experiencias (estudante_id, ordem);

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  titulo text not null check (char_length(titulo) between 2 and 160),
  problema text check (char_length(problema) <= 800),
  acoes text not null check (char_length(acoes) between 10 and 1500),
  ferramentas text check (char_length(ferramentas) <= 400),
  resultado text check (char_length(resultado) <= 800),
  inicio date,
  fim date,
  link text check (char_length(link) <= 300),
  ordem smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index projetos_estudante_idx on public.projetos (estudante_id, ordem);

create table public.certificacoes (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  nome text not null check (char_length(nome) between 2 and 160),
  emissor text check (char_length(emissor) <= 160),
  concluido_em date,
  carga_horaria smallint check (carga_horaria between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);

create table public.idiomas (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  idioma text not null check (char_length(idioma) between 2 and 60),
  nivel public.nivel_idioma not null,
  created_at timestamptz not null default now(),
  unique (estudante_id, idioma),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);

-- Competências com evidência. Sugestões da IA nunca nascem confirmadas.
create table public.habilidades (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  nome text not null check (char_length(nome) between 2 and 100),
  categoria public.categoria_habilidade not null,
  evidencia text check (char_length(evidencia) <= 400),
  origem public.origem_habilidade not null,
  status public.status_habilidade not null,
  confirmada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create unique index habilidades_nome_idx on public.habilidades (estudante_id, lower(nome));

create function private.preparar_habilidade()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Sugestão da IA entra sempre como sugerida; só o estudante confirma depois.
    if new.origem = 'ia' then
      new.status := 'sugerida';
    end if;
  else
    new.estudante_id := old.estudante_id;
    new.instituicao_id := old.instituicao_id;
    new.origem := old.origem;
    new.created_at := old.created_at;
  end if;
  if new.status = 'confirmada' and (tg_op = 'INSERT' or old.status <> 'confirmada') then
    new.confirmada_em := now();
  elsif new.status <> 'confirmada' then
    new.confirmada_em := null;
  end if;
  return new;
end;
$$;
create trigger preparar_habilidade before insert or update on public.habilidades
  for each row execute function private.preparar_habilidade();

-- ---------------------------------------------------------------------------
-- Versões de currículo, análises de vaga e arquivos enviados ao scanner
-- ---------------------------------------------------------------------------
create table public.curriculo_versoes (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  titulo text not null check (char_length(titulo) between 2 and 120),
  vaga_alvo text check (char_length(vaga_alvo) <= 160),
  modelo public.modelo_curriculo not null default 'classico',
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'),
  storage_path text not null,
  -- Resultado do scanner de leitura sobre o próprio PDF gerado.
  scan jsonb,
  created_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index curriculo_versoes_estudante_idx on public.curriculo_versoes (estudante_id, created_at desc);

create table public.analises_vaga (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  origem text not null check (origem in ('colada', 'vaga')),
  vaga_id uuid references public.vagas (id) on delete set null,
  titulo text not null check (char_length(titulo) between 2 and 160),
  descricao text check (char_length(descricao) <= 8000),
  resultado jsonb not null check (jsonb_typeof(resultado) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index analises_vaga_estudante_idx on public.analises_vaga (estudante_id, created_at desc);

create table public.curriculos_enviados (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null,
  instituicao_id uuid not null,
  nome_exibicao text not null check (char_length(nome_exibicao) between 1 and 120),
  storage_path text not null,
  formato text not null check (formato in ('pdf', 'docx')),
  tamanho_bytes int not null check (tamanho_bytes between 1 and 5242880),
  scan jsonb,
  created_at timestamptz not null default now(),
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index curriculos_enviados_estudante_idx on public.curriculos_enviados (estudante_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['perfis_profissionais', 'experiencias', 'projetos', 'habilidades'] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: somente o próprio estudante (leitura e escrita)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'perfis_profissionais', 'experiencias', 'projetos', 'certificacoes', 'idiomas', 'habilidades',
    'curriculo_versoes', 'analises_vaga', 'curriculos_enviados'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "próprio estudante lê" on public.%I for select to authenticated using ((select private.e_do_estudante(estudante_id)))', t);
    execute format(
      'create policy "próprio estudante cria" on public.%I for insert to authenticated with check ('
      || 'instituicao_id = (select private.instituicao_atual()) and (select private.e_do_estudante(estudante_id)))', t);
    execute format(
      'create policy "próprio estudante altera" on public.%I for update to authenticated '
      || 'using ((select private.e_do_estudante(estudante_id))) with check ((select private.e_do_estudante(estudante_id)))', t);
    execute format(
      'create policy "próprio estudante exclui" on public.%I for delete to authenticated using ((select private.e_do_estudante(estudante_id)))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado; caminho <instituicao>/<estudante>/<arquivo>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curriculos', 'curriculos', false, 5242880,
        array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "currículos: estudante lê os próprios" on storage.objects
  for select to authenticated
  using (bucket_id = 'curriculos' and (storage.foldername(name))[2] = (select private.estudante_atual())::text);
create policy "currículos: estudante envia para a própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'curriculos'
    and (storage.foldername(name))[1] = (select private.instituicao_atual())::text
    and (storage.foldername(name))[2] = (select private.estudante_atual())::text
  );
create policy "currículos: estudante exclui os próprios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'curriculos' and (storage.foldername(name))[2] = (select private.estudante_atual())::text);

-- ---------------------------------------------------------------------------
-- Migração do modelo antigo (curriculos: vivências e texto gerado) e remoção da tabela
-- ---------------------------------------------------------------------------
insert into public.perfis_profissionais (estudante_id, instituicao_id)
select c.estudante_id, c.instituicao_id from public.curriculos c
on conflict do nothing;

-- O texto de vivências vira uma experiência informal, para nada se perder.
insert into public.experiencias (estudante_id, instituicao_id, tipo, cargo, atividades)
select c.estudante_id, c.instituicao_id, 'informal', 'Experiências pessoais', left(c.vivencias, 2000)
  from public.curriculos c
 where c.vivencias is not null and char_length(c.vivencias) >= 10;

-- Competências que a IA identificou viram sugestões a confirmar.
insert into public.habilidades (estudante_id, instituicao_id, nome, categoria, evidencia, origem, status)
select distinct on (c.estudante_id, lower(item ->> 'competencia'))
       c.estudante_id, c.instituicao_id, left(item ->> 'competencia', 100), 'tecnica',
       left(item ->> 'origem', 400), 'ia', 'sugerida'
  from public.curriculos c
 cross join lateral jsonb_array_elements(c.competencias_vivencias) item
 where char_length(coalesce(item ->> 'competencia', '')) >= 2
on conflict do nothing;

drop table public.curriculos;

-- Funções de IA do novo construtor.
alter table public.ia_uso drop constraint ia_uso_funcao_check;
alter table public.ia_uso add constraint ia_uso_funcao_check
  check (funcao in ('vivencias', 'curriculo', 'insights', 'competencias', 'vaga'));
