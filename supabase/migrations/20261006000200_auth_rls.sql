-- KairusEdu: autorização no banco (RLS), integridade e auditoria.
-- Regra geral: nenhuma policy para anon; authenticated só enxerga a própria instituição,
-- e dentro dela o escopo do papel (gestor: tudo; coordenador: cursos que coordena;
-- estudante: apenas os próprios dados, nunca o score de risco).

-- ---------------------------------------------------------------------------
-- Privilégios base
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Contexto do usuário autenticado
-- ---------------------------------------------------------------------------
create function private.instituicao_atual()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.instituicao_id from public.perfis p where p.id = auth.uid() and p.ativo
$$;

create function private.papel_atual()
returns public.papel_usuario
language sql stable security definer
set search_path = ''
as $$
  select p.papel from public.perfis p where p.id = auth.uid() and p.ativo
$$;

create function private.e_equipe()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.papel in ('gestor', 'coordenador') from public.perfis p where p.id = auth.uid() and p.ativo),
    false
  )
$$;

create function private.cursos_coordenados()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select c.curso_id
  from public.coordenacoes_curso c
  join public.perfis p on p.id = c.perfil_id and p.ativo
  where c.perfil_id = auth.uid()
$$;

create function private.estudante_atual()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select e.id
  from public.estudantes e
  join public.perfis p on p.id = e.perfil_id and p.ativo
  where e.perfil_id = auth.uid()
$$;

-- Verdadeiro se o usuário pode ver o estudante (mesma regra da policy de estudantes).
create function private.pode_ver_estudante(p_estudante uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.estudantes e
    join public.perfis p on p.id = auth.uid() and p.ativo and p.instituicao_id = e.instituicao_id
    where e.id = p_estudante
      and (
        p.papel = 'gestor'
        or (p.papel = 'coordenador' and exists (
          select 1 from public.coordenacoes_curso c where c.perfil_id = p.id and c.curso_id = e.curso_id
        ))
        or e.perfil_id = p.id
      )
  )
$$;

create function private.periodo_corrente()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select pl.id from public.periodos_letivos pl
  where pl.instituicao_id = private.instituicao_atual() and not pl.encerrado
  order by pl.inicio desc limit 1
$$;

create function private.ultimo_encerrado(p_offset int default 0)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select pl.id from public.periodos_letivos pl
  where pl.instituicao_id = private.instituicao_atual() and pl.encerrado
  order by pl.inicio desc offset p_offset limit 1
$$;

-- Registro de auditoria. Chamado apenas por triggers e funções do próprio banco.
create function private.registrar_auditoria(
  p_instituicao uuid, p_acao text, p_entidade text, p_entidade_id uuid, p_detalhes jsonb default '{}'::jsonb
)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.audit_log (instituicao_id, ator_id, acao, entidade, entidade_id, detalhes)
  values (p_instituicao, auth.uid(), p_acao, p_entidade, p_entidade_id, coalesce(p_detalhes, '{}'::jsonb))
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.instituicoes enable row level security;
alter table public.perfis enable row level security;
alter table public.cursos enable row level security;
alter table public.coordenacoes_curso enable row level security;
alter table public.periodos_letivos enable row level security;
alter table public.estudantes enable row level security;
alter table public.vinculos_periodo enable row level security;
alter table public.indicadores_academicos enable row level security;
alter table public.avaliacoes_risco enable row level security;
alter table public.acoes_permanencia enable row level security;
alter table public.pedidos_desligamento enable row level security;
alter table public.respostas_desligamento enable row level security;
alter table public.solicitacoes_apoio enable row level security;
alter table public.insights enable row level security;
alter table public.audit_log enable row level security;

create policy "instituicoes: própria" on public.instituicoes
  for select to authenticated
  using (id = (select private.instituicao_atual()));

-- Estudantes não veem outros perfis; a equipe vê apenas perfis da equipe (não nomes de alunos).
create policy "perfis: próprio ou equipe" on public.perfis
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      instituicao_id = (select private.instituicao_atual())
      and (select private.e_equipe())
      and papel in ('gestor', 'coordenador')
    )
  );

create policy "cursos: instituição" on public.cursos
  for select to authenticated
  using (instituicao_id = (select private.instituicao_atual()));

create policy "coordenacoes: gestor ou próprias" on public.coordenacoes_curso
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and ((select private.papel_atual()) = 'gestor' or perfil_id = (select auth.uid()))
  );

create policy "periodos: instituição" on public.periodos_letivos
  for select to authenticated
  using (instituicao_id = (select private.instituicao_atual()));

create policy "estudantes: escopo do papel" on public.estudantes
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (
      (select private.papel_atual()) = 'gestor'
      or ((select private.papel_atual()) = 'coordenador' and curso_id in (select private.cursos_coordenados()))
      or perfil_id = (select auth.uid())
    )
  );

-- Tabelas filhas: a subconsulta em estudantes aplica a policy acima.
create policy "vinculos: estudantes visíveis" on public.vinculos_periodo
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "indicadores: estudantes visíveis" on public.indicadores_academicos
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "risco: somente equipe" on public.avaliacoes_risco
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "acoes: equipe lê" on public.acoes_permanencia
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "acoes: equipe registra" on public.acoes_permanencia
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and criada_por = (select auth.uid())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "acoes: equipe atualiza" on public.acoes_permanencia
  for update to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  )
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "pedidos: equipe lê" on public.pedidos_desligamento
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  );

-- respostas_desligamento: RLS ativo e nenhuma policy. Leitura apenas agregada via função.

create policy "solicitações: estudante ou equipe lê" on public.solicitacoes_apoio
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "solicitações: estudante abre" on public.solicitacoes_apoio
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.papel_atual()) = 'estudante'
    and estudante_id = (select private.estudante_atual())
    and status = 'aberta'
  );

create policy "solicitações: equipe atualiza" on public.solicitacoes_apoio
  for update to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  )
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
  );

create policy "insights: equipe" on public.insights
  for select to authenticated
  using (instituicao_id = (select private.instituicao_atual()) and (select private.e_equipe()));

create policy "auditoria: gestor" on public.audit_log
  for select to authenticated
  using (instituicao_id = (select private.instituicao_atual()) and (select private.papel_atual()) = 'gestor');

-- ---------------------------------------------------------------------------
-- Integridade
-- ---------------------------------------------------------------------------
create function private.validar_coordenacao()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.perfis p where p.id = new.perfil_id and p.papel = 'coordenador') then
    raise exception 'Somente perfis de coordenador podem coordenar cursos.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validar_coordenacao before insert or update on public.coordenacoes_curso
  for each row execute function private.validar_coordenacao();

create function private.preparar_acao()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Campos de origem são imutáveis.
    new.estudante_id := old.estudante_id;
    new.instituicao_id := old.instituicao_id;
    new.criada_por := old.criada_por;
    new.created_at := old.created_at;
  end if;

  if not exists (
    select 1 from public.perfis p
    where p.id = new.responsavel_id and p.ativo and p.papel in ('gestor', 'coordenador')
  ) then
    raise exception 'O responsável precisa ser um membro ativo da equipe.' using errcode = '23514';
  end if;

  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    new.concluida_em := now();
  elsif new.status <> 'concluida' then
    new.concluida_em := null;
  end if;
  return new;
end;
$$;
create trigger preparar_acao before insert or update on public.acoes_permanencia
  for each row execute function private.preparar_acao();

create function private.preparar_solicitacao()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.estudante_id := old.estudante_id;
    new.instituicao_id := old.instituicao_id;
    new.assunto := old.assunto;
    new.mensagem := old.mensagem;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger preparar_solicitacao before update on public.solicitacoes_apoio
  for each row execute function private.preparar_solicitacao();

create function private.marcar_sinalizacao()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.sinalizado_previamente := exists (
    select 1 from public.avaliacoes_risco r
    where r.estudante_id = new.estudante_id and r.faixa in ('atencao', 'alto') and r.gerada_em <= new.aberto_em
  );
  return new;
end;
$$;
create trigger marcar_sinalizacao before insert on public.pedidos_desligamento
  for each row execute function private.marcar_sinalizacao();

alter table public.pedidos_desligamento add column pesquisa_respondida boolean not null default false;

create function private.sincronizar_resposta()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.pedidos_desligamento
     set pesquisa_respondida = (tg_op <> 'DELETE')
   where id = coalesce(new.pedido_id, old.pedido_id);
  return null;
end;
$$;
create trigger sincronizar_resposta after insert or delete on public.respostas_desligamento
  for each row execute function private.sincronizar_resposta();

-- ---------------------------------------------------------------------------
-- Auditoria de operações sensíveis (sem conteúdo textual, apenas campos alterados)
-- ---------------------------------------------------------------------------
create function private.auditar_alteracao()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_campos jsonb := '{}'::jsonb;
  v_novo jsonb;
  v_antigo jsonb;
begin
  if tg_op = 'UPDATE' then
    v_novo := to_jsonb(new);
    v_antigo := to_jsonb(old);
    select coalesce(jsonb_agg(k), '[]'::jsonb) into v_campos
      from jsonb_object_keys(v_novo) k
     where k not in ('updated_at') and v_novo -> k is distinct from v_antigo -> k;
    v_campos := jsonb_build_object('campos', v_campos);
    if new.status is distinct from old.status then
      v_campos := v_campos || jsonb_build_object('status', new.status::text);
    end if;
  else
    v_campos := jsonb_build_object('status', new.status::text);
  end if;

  perform private.registrar_auditoria(new.instituicao_id, lower(tg_op), tg_table_name, new.id, v_campos);
  return null;
end;
$$;

create trigger auditar_acoes after insert or update on public.acoes_permanencia
  for each row execute function private.auditar_alteracao();
create trigger auditar_solicitacoes after insert or update on public.solicitacoes_apoio
  for each row execute function private.auditar_alteracao();
create trigger auditar_pedidos after insert or update on public.pedidos_desligamento
  for each row execute function private.auditar_alteracao();

-- ---------------------------------------------------------------------------
-- Views de leitura (security_invoker: aplicam a RLS de quem consulta)
-- ---------------------------------------------------------------------------
create view public.v_carteira
with (security_invoker = true)
as
select
  e.id as estudante_id,
  e.codigo,
  e.curso_id,
  c.nome as curso_nome,
  e.periodo_atual,
  r.probabilidade,
  r.faixa,
  a.ultima_acao_status,
  case
    when a.ultima_acao_status is not null then 'registrada'
    when r.faixa = 'baixo' or r.faixa is null then 'nao_se_aplica'
    else 'pendente'
  end as situacao_acao
from public.estudantes e
join public.cursos c on c.id = e.curso_id
left join public.avaliacoes_risco r
  on r.estudante_id = e.id and r.periodo_letivo_id = private.periodo_corrente()
left join lateral (
  select ap.status as ultima_acao_status
  from public.acoes_permanencia ap
  where ap.estudante_id = e.id and ap.status <> 'cancelada'
  order by ap.created_at desc
  limit 1
) a on true
where e.situacao = 'ativo';

create view public.v_acoes
with (security_invoker = true)
as
select
  ap.id,
  ap.estudante_id,
  e.codigo,
  c.nome as curso_nome,
  ap.tipo,
  ap.descricao,
  ap.responsavel_id,
  resp.nome as responsavel_nome,
  ap.prazo,
  ap.status,
  ap.concluida_em,
  ap.created_at
from public.acoes_permanencia ap
join public.estudantes e on e.id = ap.estudante_id
join public.cursos c on c.id = e.curso_id
left join public.perfis resp on resp.id = ap.responsavel_id;

create view public.v_pedidos_desligamento
with (security_invoker = true)
as
select
  pd.id,
  pd.estudante_id,
  e.codigo,
  c.nome as curso_nome,
  pd.tipo,
  pd.status,
  pd.sinalizado_previamente,
  pd.pesquisa_respondida,
  pd.aberto_em,
  pd.concluido_em
from public.pedidos_desligamento pd
join public.estudantes e on e.id = pd.estudante_id
join public.cursos c on c.id = e.curso_id;

create view public.v_solicitacoes_apoio
with (security_invoker = true)
as
select
  s.id,
  s.estudante_id,
  e.codigo,
  c.nome as curso_nome,
  s.assunto,
  s.mensagem,
  s.status,
  s.created_at
from public.solicitacoes_apoio s
join public.estudantes e on e.id = s.estudante_id
join public.cursos c on c.id = e.curso_id;

revoke all on public.v_carteira, public.v_acoes, public.v_pedidos_desligamento, public.v_solicitacoes_apoio from anon;
grant select on public.v_carteira, public.v_acoes, public.v_pedidos_desligamento, public.v_solicitacoes_apoio to authenticated;

-- ---------------------------------------------------------------------------
-- Funções de leitura (RPC)
-- ---------------------------------------------------------------------------

-- Ficha do estudante para a equipe. Registra o acesso na auditoria.
create function public.abrir_ficha(p_codigo text)
returns table (
  estudante_id uuid,
  codigo text,
  curso_nome text,
  periodo_atual smallint,
  probabilidade numeric,
  faixa public.faixa_risco,
  fatores jsonb,
  acao_sugerida text,
  acao_sugerida_descricao text,
  modelo_versao text,
  gerada_em timestamptz,
  frequencia numeric,
  coeficiente numeric
)
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_inst uuid;
begin
  if not private.e_equipe() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select e.id, e.instituicao_id into v_id, v_inst
    from public.estudantes e where e.codigo = upper(p_codigo);
  if v_id is null then
    return;
  end if;

  perform private.registrar_auditoria(v_inst, 'ficha.visualizada', 'estudantes', v_id);

  return query
  select e.id, e.codigo, c.nome, e.periodo_atual,
         r.probabilidade, r.faixa, r.fatores, r.acao_sugerida, r.acao_sugerida_descricao,
         r.modelo_versao, r.gerada_em,
         i.frequencia, i.coeficiente
    from public.estudantes e
    join public.cursos c on c.id = e.curso_id
    left join public.avaliacoes_risco r on r.estudante_id = e.id and r.periodo_letivo_id = private.periodo_corrente()
    left join public.indicadores_academicos i on i.estudante_id = e.id and i.periodo_letivo_id = private.periodo_corrente()
   where e.id = v_id;
end;
$$;

-- Resumo da carteira (respeita o escopo do papel via RLS).
create function public.carteira_resumo(p_curso uuid default null)
returns table (total int, alto int, atencao int, alto_com_acao int)
language sql stable security invoker
set search_path = ''
as $$
  select
    count(*)::int,
    count(*) filter (where v.faixa = 'alto')::int,
    count(*) filter (where v.faixa = 'atencao')::int,
    count(*) filter (where v.faixa = 'alto' and v.situacao_acao = 'registrada')::int
  from public.v_carteira v
  where p_curso is null or v.curso_id = p_curso
$$;

-- Indicadores da visão geral. Exclusivo da gestão.
create function public.painel_kpis()
returns table (
  periodo_encerrado text,
  periodo_corrente text,
  taxa_evasao numeric,
  taxa_evasao_anterior numeric,
  cancelamentos int,
  cancelamentos_anterior int,
  trancamentos int,
  trancamentos_anterior int,
  alunos_em_andamento int,
  alunos_risco int,
  alunos_risco_anterior int
)
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_atual uuid := private.ultimo_encerrado(0);
  v_ant uuid := private.ultimo_encerrado(1);
  v_corr uuid := private.periodo_corrente();
begin
  if private.papel_atual() is distinct from 'gestor' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  with base as (
    select vp.periodo_letivo_id, vp.situacao_final from public.vinculos_periodo vp
    where vp.periodo_letivo_id in (v_atual, v_ant)
  ),
  agg as (
    select b.periodo_letivo_id,
           count(*) as total,
           count(*) filter (where b.situacao_final in ('trancado', 'cancelado', 'evadido')) as evadidos,
           count(*) filter (where b.situacao_final = 'cancelado') as cancel,
           count(*) filter (where b.situacao_final = 'trancado') as tranc
      from base b group by b.periodo_letivo_id
  )
  select
    (select pl.codigo from public.periodos_letivos pl where pl.id = v_atual),
    (select pl.codigo from public.periodos_letivos pl where pl.id = v_corr),
    (select round(100.0 * a.evadidos / nullif(a.total, 0), 1) from agg a where a.periodo_letivo_id = v_atual),
    (select round(100.0 * a.evadidos / nullif(a.total, 0), 1) from agg a where a.periodo_letivo_id = v_ant),
    (select a.cancel::int from agg a where a.periodo_letivo_id = v_atual),
    (select a.cancel::int from agg a where a.periodo_letivo_id = v_ant),
    (select a.tranc::int from agg a where a.periodo_letivo_id = v_atual),
    (select a.tranc::int from agg a where a.periodo_letivo_id = v_ant),
    (select count(*)::int from public.vinculos_periodo vp where vp.periodo_letivo_id = v_corr),
    (select count(*)::int from public.avaliacoes_risco r where r.periodo_letivo_id = v_corr and r.faixa <> 'baixo'),
    (select count(*)::int from public.avaliacoes_risco r where r.periodo_letivo_id = v_atual and r.faixa <> 'baixo');
end;
$$;

create function public.painel_evasao_semestres()
returns table (codigo text, total int, evadidos int, taxa numeric)
language plpgsql stable security invoker
set search_path = ''
as $$
begin
  if private.papel_atual() is distinct from 'gestor' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
  select pl.codigo,
         count(vp.id)::int,
         (count(vp.id) filter (where vp.situacao_final in ('trancado', 'cancelado', 'evadido')))::int,
         round(100.0 * count(vp.id) filter (where vp.situacao_final in ('trancado', 'cancelado', 'evadido'))
               / nullif(count(vp.id), 0), 1)
    from public.periodos_letivos pl
    left join public.vinculos_periodo vp on vp.periodo_letivo_id = pl.id
   where pl.encerrado and pl.instituicao_id = private.instituicao_atual()
   group by pl.id, pl.codigo, pl.inicio
   order by pl.inicio;
end;
$$;

create function public.painel_risco_faixas()
returns table (faixa public.faixa_risco, total int)
language plpgsql stable security invoker
set search_path = ''
as $$
begin
  if private.papel_atual() is distinct from 'gestor' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
  select f.faixa, count(r.id)::int
    from unnest(enum_range(null::public.faixa_risco)) as f(faixa)
    left join public.avaliacoes_risco r
      on r.faixa = f.faixa and r.periodo_letivo_id = private.periodo_corrente()
   group by f.faixa
   order by f.faixa;
end;
$$;

-- Evasão por recorte nos semestres encerrados: 'curso', 'periodo' ou 'modalidade'.
create function public.painel_evasao_por(p_recorte text)
returns table (rotulo text, ordem int, total int, evadidos int, taxa numeric)
language plpgsql stable security invoker
set search_path = ''
as $$
begin
  if private.papel_atual() is distinct from 'gestor' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if p_recorte not in ('curso', 'periodo', 'modalidade') then
    raise exception 'Recorte inválido.' using errcode = '22023';
  end if;

  return query
  with base as (
    select
      case p_recorte
        when 'curso' then c.nome
        when 'periodo' then vp.periodo_curso::text || 'º'
        else c.modalidade::text
      end as rotulo,
      case when p_recorte = 'periodo' then vp.periodo_curso::int else 0 end as ordem,
      vp.situacao_final
    from public.vinculos_periodo vp
    join public.periodos_letivos pl on pl.id = vp.periodo_letivo_id and pl.encerrado
    join public.estudantes e on e.id = vp.estudante_id
    join public.cursos c on c.id = e.curso_id
  )
  select b.rotulo, b.ordem,
         count(*)::int,
         (count(*) filter (where b.situacao_final in ('trancado', 'cancelado', 'evadido')))::int,
         round(100.0 * count(*) filter (where b.situacao_final in ('trancado', 'cancelado', 'evadido'))
               / nullif(count(*), 0), 1)
    from base b
   group by b.rotulo, b.ordem
   order by b.ordem, 5 desc;
end;
$$;

-- Motivos de desligamento agregados. Respostas individuais nunca saem do banco.
-- Recortes com menos de 5 respostas não são exibidos para evitar reidentificação.
create function public.painel_motivos()
returns table (motivo public.motivo_desligamento, total int, percentual numeric, total_respostas int)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_inst uuid := private.instituicao_atual();
  v_total int;
begin
  if private.papel_atual() is distinct from 'gestor' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select count(*) into v_total from public.respostas_desligamento rd where rd.instituicao_id = v_inst;
  if v_total < 5 then
    return;
  end if;

  return query
  select rd.motivo_principal, count(*)::int, round(100.0 * count(*) / v_total, 0), v_total
    from public.respostas_desligamento rd
   where rd.instituicao_id = v_inst
   group by rd.motivo_principal
   order by 2 desc;
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.abrir_ficha(text),
  public.carteira_resumo(uuid),
  public.painel_kpis(),
  public.painel_evasao_semestres(),
  public.painel_risco_faixas(),
  public.painel_evasao_por(text),
  public.painel_motivos()
to authenticated;
