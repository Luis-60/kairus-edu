-- KairusEdu: equipe de apoio, questionário de desligamento do portal do estudante,
-- serviços de apoio e indicadores agregados. Migration aditiva: dados existentes são migrados.

-- ===========================================================================
-- 1. Equipe de apoio e permissão explícita para respostas individuais
-- ===========================================================================
alter table public.perfis
  add column ve_respostas_desligamento boolean not null default false;

comment on column public.perfis.ve_respostas_desligamento is
  'Autorização explícita para ler respostas individuais do questionário de desligamento (nunca as de saúde).';

create or replace function private.e_equipe()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.papel in ('gestor', 'coordenador', 'apoio') from public.perfis p where p.id = auth.uid() and p.ativo),
    false
  )
$$;

-- Papéis com visão da instituição inteira (sem escopo de curso).
create function private.ve_instituicao_inteira()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.papel in ('gestor', 'apoio') from public.perfis p where p.id = auth.uid() and p.ativo),
    false
  )
$$;

create function private.pode_ver_respostas()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.ve_respostas_desligamento and p.papel in ('gestor', 'coordenador', 'apoio')
       from public.perfis p where p.id = auth.uid() and p.ativo),
    false
  )
$$;

create or replace function private.pode_ver_estudante(p_estudante uuid)
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
        p.papel in ('gestor', 'apoio')
        or (p.papel = 'coordenador' and exists (
          select 1 from public.coordenacoes_curso c where c.perfil_id = p.id and c.curso_id = e.curso_id
        ))
        or e.perfil_id = p.id
      )
  )
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

drop policy "estudantes: escopo do papel" on public.estudantes;
create policy "estudantes: escopo do papel" on public.estudantes
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (
      (select private.ve_instituicao_inteira())
      or ((select private.papel_atual()) = 'coordenador' and curso_id in (select private.cursos_coordenados()))
      or perfil_id = (select auth.uid())
    )
  );

drop policy "perfis: próprio ou equipe" on public.perfis;
create policy "perfis: próprio ou equipe" on public.perfis
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      instituicao_id = (select private.instituicao_atual())
      and (select private.e_equipe())
      and papel in ('gestor', 'coordenador', 'apoio')
    )
  );

-- A equipe de apoio também pode ser responsável por ações de permanência.
create or replace function private.preparar_acao()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.estudante_id := old.estudante_id;
    new.instituicao_id := old.instituicao_id;
    new.criada_por := old.criada_por;
    new.created_at := old.created_at;
  end if;

  if not exists (
    select 1 from public.perfis p
    where p.id = new.responsavel_id and p.ativo and p.papel in ('gestor', 'coordenador', 'apoio')
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

-- ===========================================================================
-- 2. Serviços de apoio que a instituição realmente oferece
-- ===========================================================================
create type public.categoria_servico as enum (
  'financeiro', 'academico', 'psicologico', 'carreira', 'horario', 'estagio', 'outro'
);

create table public.servicos_apoio (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  descricao text not null check (char_length(descricao) <= 400),
  categoria public.categoria_servico not null,
  contato text check (char_length(contato) <= 160),
  ativo boolean not null default true,
  ordem smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (instituicao_id, nome),
  unique (id, instituicao_id)
);

alter table public.servicos_apoio enable row level security;
create policy "serviços: instituição" on public.servicos_apoio
  for select to authenticated using (instituicao_id = (select private.instituicao_atual()));

-- Pedidos de apoio podem nascer no questionário de desligamento.
alter table public.solicitacoes_apoio
  add column origem text not null default 'estudante' check (origem in ('estudante', 'pesquisa')),
  add column servico_id uuid,
  add constraint solicitacoes_servico_fk foreign key (servico_id, instituicao_id)
    references public.servicos_apoio (id, instituicao_id) on delete set null (servico_id);

-- ===========================================================================
-- 3. Pedidos de desligamento: risco no momento do pedido e registro manual
-- ===========================================================================
alter table public.pedidos_desligamento
  add column faixa_no_pedido public.faixa_risco,
  add column probabilidade_no_pedido numeric(5,4) check (probabilidade_no_pedido between 0 and 1),
  add column origem text not null default 'integracao' check (origem in ('integracao', 'manual')),
  add column registrado_por uuid references public.perfis (id) on delete set null;

comment on column public.pedidos_desligamento.faixa_no_pedido is
  'Última avaliação de risco anterior à abertura. Gravada uma vez e nunca reescrita.';

-- Preenche o retrato do risco para os pedidos já existentes.
update public.pedidos_desligamento p
   set (faixa_no_pedido, probabilidade_no_pedido) = (
     select ar.faixa, ar.probabilidade from public.avaliacoes_risco ar
      where ar.estudante_id = p.estudante_id and ar.gerada_em <= p.aberto_em
      order by ar.gerada_em desc limit 1
   );

create or replace function private.marcar_sinalizacao()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_faixa public.faixa_risco;
  v_prob numeric;
begin
  select r.faixa, r.probabilidade into v_faixa, v_prob
    from public.avaliacoes_risco r
   where r.estudante_id = new.estudante_id and r.gerada_em <= new.aberto_em
   order by r.gerada_em desc limit 1;

  new.faixa_no_pedido := v_faixa;
  new.probabilidade_no_pedido := v_prob;
  new.sinalizado_previamente := exists (
    select 1 from public.avaliacoes_risco r
    where r.estudante_id = new.estudante_id and r.faixa in ('atencao', 'alto') and r.gerada_em <= new.aberto_em
  );
  new.status := coalesce(new.status, 'aberto');
  return new;
end;
$$;

-- O histórico do pedido não pode ser reescrito; apenas status e conclusão mudam.
create function private.proteger_pedido()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.estudante_id := old.estudante_id;
  new.instituicao_id := old.instituicao_id;
  new.tipo := old.tipo;
  new.aberto_em := old.aberto_em;
  new.sinalizado_previamente := old.sinalizado_previamente;
  new.faixa_no_pedido := old.faixa_no_pedido;
  new.probabilidade_no_pedido := old.probabilidade_no_pedido;
  new.origem := old.origem;
  new.registrado_por := old.registrado_por;
  new.created_at := old.created_at;
  if new.status <> 'aberto' and old.status = 'aberto' then
    new.concluido_em := coalesce(new.concluido_em, now());
  elsif new.status = 'aberto' then
    new.concluido_em := null;
  end if;
  return new;
end;
$$;
create trigger proteger_pedido before update on public.pedidos_desligamento
  for each row execute function private.proteger_pedido();

create policy "pedidos: estudante lê os próprios" on public.pedidos_desligamento
  for select to authenticated
  using (estudante_id = (select private.estudante_atual()));

create policy "pedidos: equipe registra" on public.pedidos_desligamento
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and origem = 'manual'
    and registrado_por = (select auth.uid())
    and estudante_id in (select e.id from public.estudantes e)
  );

create policy "pedidos: equipe atualiza o status" on public.pedidos_desligamento
  for update to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  )
  with check (instituicao_id = (select private.instituicao_atual()) and (select private.e_equipe()));

-- ===========================================================================
-- 4. Questionário de desligamento
-- ===========================================================================
create type public.status_questionario as enum ('pendente', 'em_andamento', 'enviado', 'recusado', 'encerrado');
create type public.resposta_reconsideracao as enum ('sim', 'talvez', 'nao', 'prefiro_nao_responder');

create table public.questionarios_desligamento (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null,
  pedido_id uuid not null unique,
  estudante_id uuid not null,
  versao text not null,
  status public.status_questionario not null default 'pendente',
  etapa_atual smallint not null default 1 check (etapa_atual between 1 and 10),
  reconsideraria public.resposta_reconsideracao,
  -- Consentimento específico (LGPD art. 11) para registrar informações de saúde.
  consentimento_saude boolean not null default false,
  consentimento_saude_em timestamptz,
  ciencia_em timestamptz,
  iniciado_em timestamptz,
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, instituicao_id),
  foreign key (pedido_id, instituicao_id) references public.pedidos_desligamento (id, instituicao_id) on delete cascade,
  foreign key (estudante_id, instituicao_id) references public.estudantes (id, instituicao_id) on delete cascade
);
create index questionarios_status_idx on public.questionarios_desligamento (instituicao_id, status);
create index questionarios_estudante_idx on public.questionarios_desligamento (estudante_id);

create table public.questionario_motivos (
  questionario_id uuid not null,
  instituicao_id uuid not null,
  motivo public.motivo_desligamento not null,
  primary key (questionario_id, motivo),
  foreign key (questionario_id, instituicao_id) references public.questionarios_desligamento (id, instituicao_id) on delete cascade
);

create table public.questionario_respostas (
  questionario_id uuid not null,
  instituicao_id uuid not null,
  pergunta text not null check (pergunta ~ '^[a-z0-9_]{2,60}$'),
  valor jsonb not null,
  saude boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (questionario_id, pergunta),
  foreign key (questionario_id, instituicao_id) references public.questionarios_desligamento (id, instituicao_id) on delete cascade
);

create trigger set_updated_at before update on public.questionarios_desligamento
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.questionario_respostas
  for each row execute function private.set_updated_at();

-- Migra as respostas existentes (um motivo principal) para o modelo novo.
insert into public.questionarios_desligamento (instituicao_id, pedido_id, estudante_id, versao, status, ciencia_em, iniciado_em, enviado_em)
select p.instituicao_id, p.id, p.estudante_id, 'legado',
       case when r.id is not null then 'enviado'::public.status_questionario
            when p.status = 'aberto' then 'pendente'::public.status_questionario
            else 'encerrado'::public.status_questionario end,
       r.respondida_em, r.respondida_em, r.respondida_em
  from public.pedidos_desligamento p
  left join public.respostas_desligamento r on r.pedido_id = p.id;

insert into public.questionario_motivos (questionario_id, instituicao_id, motivo)
select q.id, q.instituicao_id, r.motivo_principal
  from public.respostas_desligamento r
  join public.questionarios_desligamento q on q.pedido_id = r.pedido_id;

insert into public.questionario_respostas (questionario_id, instituicao_id, pergunta, valor)
select q.id, q.instituicao_id, 'comentario_final', to_jsonb(r.comentario)
  from public.respostas_desligamento r
  join public.questionarios_desligamento q on q.pedido_id = r.pedido_id
 where r.comentario is not null;

-- A tabela antiga deixa de existir para não haver dados duplicados.
drop trigger sincronizar_resposta on public.respostas_desligamento;
drop function private.sincronizar_resposta();
drop table public.respostas_desligamento;

-- Todo pedido novo ganha um questionário pendente para o estudante.
create function private.criar_questionario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.questionarios_desligamento (instituicao_id, pedido_id, estudante_id, versao)
  values (new.instituicao_id, new.id, new.estudante_id, '2026.2');
  return null;
end;
$$;
create trigger criar_questionario after insert on public.pedidos_desligamento
  for each row execute function private.criar_questionario();

-- Encerrar o pedido sem resposta encerra o questionário pendente.
create function private.encerrar_questionario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status <> 'aberto' and old.status = 'aberto' then
    update public.questionarios_desligamento
       set status = 'encerrado'
     where pedido_id = new.id and status in ('pendente', 'em_andamento');
  end if;
  return null;
end;
$$;
create trigger encerrar_questionario after update on public.pedidos_desligamento
  for each row execute function private.encerrar_questionario();

-- Regras de transição do questionário (o estudante só altera o próprio, enquanto aberto).
create function private.preparar_questionario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.id := old.id;
  new.instituicao_id := old.instituicao_id;
  new.pedido_id := old.pedido_id;
  new.estudante_id := old.estudante_id;
  new.versao := old.versao;
  new.created_at := old.created_at;

  if old.status in ('enviado', 'recusado', 'encerrado') and current_setting('role', true) = 'authenticated' then
    raise exception 'Este questionário já foi finalizado.' using errcode = '23514';
  end if;

  if new.status in ('em_andamento', 'enviado') and old.iniciado_em is null then
    new.iniciado_em := now();
  end if;

  if new.consentimento_saude and not old.consentimento_saude then
    new.consentimento_saude_em := now();
  elsif not new.consentimento_saude then
    new.consentimento_saude_em := null;
    delete from public.questionario_respostas where questionario_id = old.id and saude;
    delete from public.questionario_motivos where questionario_id = old.id and motivo = 'saude';
  end if;

  if new.status = 'enviado' and old.status <> 'enviado' then
    if new.ciencia_em is null then
      raise exception 'Confirme a ciência antes de enviar.' using errcode = '23514';
    end if;
    if not exists (select 1 from public.questionario_motivos m where m.questionario_id = old.id) then
      raise exception 'Selecione ao menos um motivo.' using errcode = '23514';
    end if;
    new.enviado_em := now();
  end if;
  return new;
end;
$$;
create trigger preparar_questionario before update on public.questionarios_desligamento
  for each row execute function private.preparar_questionario();

-- Respostas e motivos: só com questionário aberto; saúde só com consentimento.
-- O GUC "role" identifica a requisição do usuário mesmo dentro de funções security definer.
create function private.checar_questionario_aberto(p_questionario uuid, p_saude boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_q record;
begin
  select q.status, q.consentimento_saude into v_q from public.questionarios_desligamento q where q.id = p_questionario;
  if v_q.status not in ('pendente', 'em_andamento') and current_setting('role', true) = 'authenticated' then
    raise exception 'Este questionário já foi finalizado.' using errcode = '23514';
  end if;
  if p_saude and not v_q.consentimento_saude then
    raise exception 'Informações de saúde exigem consentimento específico.' using errcode = '23514';
  end if;
end;
$$;

create function private.validar_resposta_questionario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.checar_questionario_aberto(old.questionario_id, false);
    return old;
  end if;
  perform private.checar_questionario_aberto(new.questionario_id, new.saude);
  return new;
end;
$$;

create function private.validar_motivo_questionario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.checar_questionario_aberto(old.questionario_id, false);
    return old;
  end if;
  perform private.checar_questionario_aberto(new.questionario_id, new.motivo = 'saude');
  return new;
end;
$$;

create trigger validar_resposta before insert or update or delete on public.questionario_respostas
  for each row execute function private.validar_resposta_questionario();
create trigger validar_motivo before insert or update or delete on public.questionario_motivos
  for each row execute function private.validar_motivo_questionario();

create trigger auditar_questionarios after update on public.questionarios_desligamento
  for each row execute function private.auditar_alteracao();

-- "Pesquisa respondida" no pedido acompanha o questionário.
create function private.sincronizar_questionario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.pedidos_desligamento
     set pesquisa_respondida = (new.status = 'enviado')
   where id = new.pedido_id and pesquisa_respondida is distinct from (new.status = 'enviado');
  return null;
end;
$$;
create trigger sincronizar_questionario after insert or update on public.questionarios_desligamento
  for each row execute function private.sincronizar_questionario();

-- RLS do questionário
alter table public.questionarios_desligamento enable row level security;
alter table public.questionario_motivos enable row level security;
alter table public.questionario_respostas enable row level security;

create policy "questionário: estudante lê o próprio" on public.questionarios_desligamento
  for select to authenticated using (estudante_id = (select private.estudante_atual()));
create policy "questionário: estudante atualiza o próprio" on public.questionarios_desligamento
  for update to authenticated
  using (estudante_id = (select private.estudante_atual()))
  with check (estudante_id = (select private.estudante_atual()));
-- A equipe vê a situação do questionário (não o conteúdo) dos estudantes do seu escopo.
create policy "questionário: equipe vê a situação" on public.questionarios_desligamento
  for select to authenticated
  using (
    instituicao_id = (select private.instituicao_atual())
    and (select private.e_equipe())
    and estudante_id in (select e.id from public.estudantes e)
  );

create function private.questionario_editavel(p_questionario uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questionarios_desligamento q
    where q.id = p_questionario
      and q.estudante_id = private.estudante_atual()
      and q.status in ('pendente', 'em_andamento')
  )
$$;

create function private.questionario_proprio(p_questionario uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questionarios_desligamento q
    where q.id = p_questionario and q.estudante_id = private.estudante_atual()
  )
$$;

create function private.questionario_visivel_equipe(p_questionario uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.pode_ver_respostas() and exists (
    select 1 from public.questionarios_desligamento q
    where q.id = p_questionario and q.status = 'enviado' and private.pode_ver_estudante(q.estudante_id)
  )
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

create policy "motivos: estudante lê os próprios" on public.questionario_motivos
  for select to authenticated using ((select private.questionario_proprio(questionario_id)));
create policy "motivos: estudante grava enquanto aberto" on public.questionario_motivos
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.questionario_editavel(questionario_id))
  );
create policy "motivos: estudante remove enquanto aberto" on public.questionario_motivos
  for delete to authenticated using ((select private.questionario_editavel(questionario_id)));
-- Equipe autorizada: nunca vê o motivo de saúde individualmente.
create policy "motivos: equipe autorizada lê" on public.questionario_motivos
  for select to authenticated
  using (motivo <> 'saude' and (select private.questionario_visivel_equipe(questionario_id)));

create policy "respostas: estudante lê as próprias" on public.questionario_respostas
  for select to authenticated using ((select private.questionario_proprio(questionario_id)));
create policy "respostas: estudante grava enquanto aberto" on public.questionario_respostas
  for insert to authenticated
  with check (
    instituicao_id = (select private.instituicao_atual())
    and (select private.questionario_editavel(questionario_id))
  );
create policy "respostas: estudante altera enquanto aberto" on public.questionario_respostas
  for update to authenticated
  using ((select private.questionario_editavel(questionario_id)))
  with check ((select private.questionario_editavel(questionario_id)));
create policy "respostas: estudante remove enquanto aberto" on public.questionario_respostas
  for delete to authenticated using ((select private.questionario_editavel(questionario_id)));
create policy "respostas: equipe autorizada lê, exceto saúde" on public.questionario_respostas
  for select to authenticated
  using (not saude and (select private.questionario_visivel_equipe(questionario_id)));

-- ===========================================================================
-- 5. View de pedidos para a equipe
-- ===========================================================================
drop view public.v_pedidos_desligamento;
create view public.v_pedidos_desligamento
with (security_invoker = true)
as
select
  pd.id,
  pd.estudante_id,
  e.codigo,
  e.curso_id,
  c.nome as curso_nome,
  pd.tipo,
  pd.status,
  pd.origem,
  pd.sinalizado_previamente,
  pd.faixa_no_pedido,
  pd.pesquisa_respondida,
  q.status as questionario_status,
  q.reconsideraria,
  pd.aberto_em,
  pd.concluido_em
from public.pedidos_desligamento pd
join public.estudantes e on e.id = pd.estudante_id
join public.cursos c on c.id = e.curso_id
left join public.questionarios_desligamento q on q.pedido_id = pd.id;

revoke all on public.v_pedidos_desligamento from anon;
grant select on public.v_pedidos_desligamento to authenticated;

-- ===========================================================================
-- 6. Indicadores agregados (gestão e equipe de apoio)
-- ===========================================================================

-- Mantém a assinatura usada pela visão geral; agora com seleção múltipla
-- (percentual sobre o total de respondentes).
create or replace function public.painel_motivos()
returns table (motivo public.motivo_desligamento, total int, percentual numeric, total_respostas int)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_inst uuid := private.instituicao_atual();
  v_total int;
begin
  if not private.ve_instituicao_inteira() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select count(*) into v_total from public.questionarios_desligamento q
   where q.instituicao_id = v_inst and q.status = 'enviado';
  if v_total < 5 then
    return;
  end if;

  return query
  select m.motivo, count(*)::int, round(100.0 * count(*) / v_total, 0), v_total
    from public.questionario_motivos m
    join public.questionarios_desligamento q on q.id = m.questionario_id and q.status = 'enviado'
   where q.instituicao_id = v_inst
   group by m.motivo
  having count(*) >= 1
   order by 2 desc;
end;
$$;

-- Painel do desligamento com filtros. Recortes com menos de 5 respondentes são suprimidos.
create function public.painel_desligamento(
  p_curso uuid default null,
  p_tipo public.tipo_desligamento default null,
  p_desde date default null
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_inst uuid := private.instituicao_atual();
  v_minimo constant int := 5;
  v_resultado jsonb;
begin
  if not private.ve_instituicao_inteira() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  with pedidos as (
    select pd.*, e.curso_id, c.nome as curso_nome, q.id as questionario_id, q.status as q_status, q.reconsideraria
      from public.pedidos_desligamento pd
      join public.estudantes e on e.id = pd.estudante_id
      join public.cursos c on c.id = e.curso_id
      left join public.questionarios_desligamento q on q.pedido_id = pd.id
     where pd.instituicao_id = v_inst
       and (p_curso is null or e.curso_id = p_curso)
       and (p_tipo is null or pd.tipo = p_tipo)
       and (p_desde is null or pd.aberto_em >= p_desde)
  ),
  respondidos as (select * from pedidos where q_status = 'enviado'),
  motivos as (
    select r.*, m.motivo from respondidos r join public.questionario_motivos m on m.questionario_id = r.questionario_id
  )
  select jsonb_build_object(
    'minimo', v_minimo,
    'pedidos', (select count(*) from pedidos),
    'abertos', (select count(*) from pedidos where status = 'aberto'),
    'respondidos', (select count(*) from respondidos),
    'sinalizados', (select count(*) from pedidos where sinalizado_previamente),
    'revertidos', (select count(*) from pedidos where status = 'revertido'),
    'apoio_gerado', (
      select count(*) from public.solicitacoes_apoio s
       where s.instituicao_id = v_inst and s.origem = 'pesquisa'
         and s.estudante_id in (select estudante_id from pedidos)
    ),
    'motivos', case when (select count(*) from respondidos) >= v_minimo then (
      select coalesce(jsonb_agg(jsonb_build_object('motivo', x.motivo, 'total', x.total,
               'pct', round(100.0 * x.total / (select count(*) from respondidos), 0)) order by x.total desc), '[]')
        from (select motivo, count(*) as total from motivos group by motivo) x
    ) end,
    'reconsideracao', case when (select count(*) from respondidos) >= v_minimo then (
      select jsonb_object_agg(coalesce(reconsideraria::text, 'sem_resposta'), n)
        from (select reconsideraria, count(*) as n from respondidos group by reconsideraria) y
    ) end,
    'por_curso', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'curso', z.curso_nome, 'respondidos', z.n,
               'principal', (select m.motivo from motivos m where m.curso_id = z.curso_id
                              group by m.motivo order by count(*) desc limit 1),
               'pct_principal', (select round(100.0 * count(*) / z.n, 0) from motivos m where m.curso_id = z.curso_id
                                  group by m.motivo order by count(*) desc limit 1)
             ) order by z.n desc), '[]')
        from (select curso_id, curso_nome, count(*) as n from respondidos group by curso_id, curso_nome having count(*) >= v_minimo) z
    ),
    'por_semestre', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'semestre', pl.codigo,
               'pedidos', (select count(*) from pedidos p where p.aberto_em::date between pl.inicio and pl.fim),
               'respondidos', (select count(*) from respondidos r where r.aberto_em::date between pl.inicio and pl.fim)
             ) order by pl.inicio), '[]')
        from public.periodos_letivos pl where pl.instituicao_id = v_inst
    ),
    'risco_x_motivo', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'sinalizado', g.sinalizado_previamente, 'respondidos', g.n,
               'motivos', (select jsonb_agg(jsonb_build_object('motivo', mm.motivo, 'pct', round(100.0 * mm.t / g.n, 0)) order by mm.t desc)
                             from (select m.motivo, count(*) as t from motivos m
                                    where m.sinalizado_previamente = g.sinalizado_previamente group by m.motivo) mm)
             )), '[]')
        from (select sinalizado_previamente, count(*) as n from respondidos group by sinalizado_previamente having count(*) >= v_minimo) g
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.painel_motivos(), public.painel_desligamento(uuid, public.tipo_desligamento, date) to authenticated;
