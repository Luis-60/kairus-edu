-- KairusEdu: painel institucional de empregabilidade (somente agregados) e pedidos de titular (LGPD).

-- ===========================================================================
-- 1. Pedidos do titular dos dados (acesso, correção, exclusão)
-- ===========================================================================
create type public.tipo_pedido_titular as enum ('acesso', 'correcao', 'exclusao', 'outro');
create type public.status_pedido_titular as enum ('aberto', 'em_andamento', 'concluido');

create table public.pedidos_titular (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  perfil_id uuid not null,
  tipo public.tipo_pedido_titular not null,
  mensagem text not null check (char_length(mensagem) between 10 and 1000),
  status public.status_pedido_titular not null default 'aberto',
  resposta text check (char_length(resposta) <= 2000),
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (perfil_id, instituicao_id) references public.perfis (id, instituicao_id) on delete cascade
);
create index pedidos_titular_status_idx on public.pedidos_titular (instituicao_id, status, created_at desc);

create trigger set_updated_at before update on public.pedidos_titular
  for each row execute function private.set_updated_at();

create function private.preparar_pedido_titular()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'aberto';
    new.resposta := null;
    new.concluido_em := null;
  else
    new.instituicao_id := old.instituicao_id;
    new.perfil_id := old.perfil_id;
    new.tipo := old.tipo;
    new.mensagem := old.mensagem;
    new.created_at := old.created_at;
    if new.status = 'concluido' and old.status <> 'concluido' then
      new.concluido_em := now();
    elsif new.status <> 'concluido' then
      new.concluido_em := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger preparar_pedido_titular before insert or update on public.pedidos_titular
  for each row execute function private.preparar_pedido_titular();

create trigger auditar_pedidos_titular after insert or update on public.pedidos_titular
  for each row execute function private.auditar_alteracao();

alter table public.pedidos_titular enable row level security;

create policy "titular: lê os próprios" on public.pedidos_titular
  for select to authenticated using (perfil_id = (select auth.uid()));
create policy "titular: abre pedido" on public.pedidos_titular
  for insert to authenticated
  with check (perfil_id = (select auth.uid()) and instituicao_id = (select private.instituicao_atual()));
-- A gestão é quem responde pela instituição (controladora) nos pedidos de titular.
create policy "titular: gestão lê" on public.pedidos_titular
  for select to authenticated
  using (instituicao_id = (select private.instituicao_atual()) and (select private.papel_atual()) = 'gestor');
create policy "titular: gestão responde" on public.pedidos_titular
  for update to authenticated
  using (instituicao_id = (select private.instituicao_atual()) and (select private.papel_atual()) = 'gestor')
  with check (instituicao_id = (select private.instituicao_atual()) and (select private.papel_atual()) = 'gestor');

-- ===========================================================================
-- 2. Painel de empregabilidade: só agregados; grupos com menos de 5 alunos são omitidos
-- ===========================================================================
create function public.painel_empregabilidade(p_curso uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_inst uuid := private.instituicao_atual();
  v_min constant int := 5;
  v_resultado jsonb;
begin
  if not private.ve_instituicao_inteira() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  with base as (
    select e.id, e.curso_id, c.nome as curso
      from public.estudantes e
      join public.cursos c on c.id = e.curso_id
     where e.instituicao_id = v_inst and e.situacao = 'ativo'
       and (p_curso is null or e.curso_id = p_curso)
  ),
  perfis as (select pp.* from public.perfis_profissionais pp join base b on b.id = pp.estudante_id),
  confirmadas as (
    select h.estudante_id, lower(trim(h.nome)) as chave, h.nome
      from public.habilidades h join base b on b.id = h.estudante_id
     where h.status = 'confirmada'
  ),
  completos as (
    select p.estudante_id from perfis p
     where p.email_contato is not null and p.telefone is not null
       and (exists (select 1 from public.experiencias x where x.estudante_id = p.estudante_id)
            or exists (select 1 from public.projetos x where x.estudante_id = p.estudante_id))
       and exists (select 1 from confirmadas c where c.estudante_id = p.estudante_id)
  ),
  versoes as (select v.estudante_id from public.curriculo_versoes v join base b on b.id = v.estudante_id),
  lacunas as (
    select distinct a.estudante_id, lower(trim(r ->> 'nome')) as chave, r ->> 'nome' as nome
      from public.analises_vaga a
      join base b on b.id = a.estudante_id
     cross join lateral jsonb_array_elements(coalesce(a.resultado -> 'requisitos', '[]'::jsonb)) r
     where r ->> 'situacao' = 'nao_confirmado'
  ),
  tamanhos as (
    select
      (select count(*) from base) as ativos,
      (select count(*) from perfis) as com_perfil,
      (select count(*) from completos) as completos,
      (select count(distinct estudante_id) from versoes) as com_curriculo,
      (select count(*) from versoes) as versoes
  )
  select jsonb_build_object(
    'minimo', v_min,
    -- Contagens menores que o mínimo voltam nulas (exibidas como "menos de 5").
    'ativos', (select ativos from tamanhos),
    'com_perfil', (select case when com_perfil >= v_min then com_perfil end from tamanhos),
    'completos', (select case when completos >= v_min then completos end from tamanhos),
    'com_curriculo', (select case when com_curriculo >= v_min then com_curriculo end from tamanhos),
    'versoes', (select case when com_curriculo >= v_min then versoes end from tamanhos),
    'competencias', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', x.nome, 'alunos', x.n) order by x.n desc), '[]')
        from (select min(nome) as nome, count(distinct estudante_id) as n from confirmadas
               group by chave having count(distinct estudante_id) >= v_min order by 2 desc limit 15) x
    ),
    'interesses', (
      select coalesce(jsonb_agg(jsonb_build_object('area', x.area, 'alunos', x.n) order by x.n desc), '[]')
        from (select min(trim(area_interesse)) as area, count(*) as n from perfis
               where area_interesse is not null
               group by lower(trim(area_interesse)) having count(*) >= v_min order by 2 desc limit 10) x
    ),
    'tipos_vaga', (
      select coalesce(jsonb_agg(jsonb_build_object('tipo', x.tipo_vaga, 'alunos', x.n) order by x.n desc), '[]')
        from (select tipo_vaga, count(*) as n from perfis where tipo_vaga is not null
               group by tipo_vaga having count(*) >= v_min) x
    ),
    'lacunas', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', x.nome, 'alunos', x.n) order by x.n desc), '[]')
        from (select min(nome) as nome, count(distinct estudante_id) as n from lacunas
               group by chave having count(distinct estudante_id) >= v_min order by 2 desc limit 10) x
    ),
    'por_curso', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'curso', x.curso, 'ativos', x.ativos,
               'com_perfil', case when x.com_perfil >= v_min then x.com_perfil end,
               'com_curriculo', case when x.com_curriculo >= v_min then x.com_curriculo end
             ) order by x.com_perfil desc, x.curso), '[]')
        from (
          select b.curso, count(*) as ativos,
                 count(*) filter (where exists (select 1 from perfis p where p.estudante_id = b.id)) as com_perfil,
                 count(*) filter (where exists (select 1 from versoes v where v.estudante_id = b.id)) as com_curriculo
            from base b group by b.curso
        ) x
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke execute on function public.painel_empregabilidade(uuid) from public, anon;
grant execute on function public.painel_empregabilidade(uuid) to authenticated;

-- ===========================================================================
-- 3. Exclusão dos dados de carreira pelo próprio estudante (registrada na auditoria)
-- ===========================================================================
create function public.registrar_exclusao_carreira()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_estudante uuid := private.estudante_atual();
begin
  if v_estudante is null then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  perform private.registrar_auditoria(private.instituicao_atual(), 'carreira.dados_excluidos', 'estudantes', v_estudante);
end;
$$;
revoke execute on function public.registrar_exclusao_carreira() from public, anon;
grant execute on function public.registrar_exclusao_carreira() to authenticated;
