-- Supressão de células: o motivo "saúde" só aparece em agregados com pelo menos 5 ocorrências,
-- mesmo quando o recorte como um todo tem respondentes suficientes.
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
  -- Saúde: contagens pequenas poderiam identificar o aluno e são omitidas.
  having m.motivo <> 'saude' or count(*) >= 5
   order by 2 desc;
end;
$$;

-- Painel do desligamento com filtros. Recortes com menos de 5 respondentes são suprimidos.
create or replace function public.painel_desligamento(
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
        from (select motivo, count(*) as total from motivos group by motivo
                having motivo <> 'saude' or count(*) >= v_minimo) x
    ) end,
    'reconsideracao', case when (select count(*) from respondidos) >= v_minimo then (
      select jsonb_object_agg(coalesce(reconsideraria::text, 'sem_resposta'), n)
        from (select reconsideraria, count(*) as n from respondidos group by reconsideraria) y
    ) end,
    'por_curso', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'curso', z.curso_nome, 'respondidos', z.n,
               'principal', (select m.motivo from motivos m where m.curso_id = z.curso_id
                              group by m.motivo having m.motivo <> 'saude' or count(*) >= v_minimo
                              order by count(*) desc limit 1),
               'pct_principal', (select round(100.0 * count(*) / z.n, 0) from motivos m where m.curso_id = z.curso_id
                                  group by m.motivo having m.motivo <> 'saude' or count(*) >= v_minimo
                                  order by count(*) desc limit 1)
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
                                    where m.sinalizado_previamente = g.sinalizado_previamente group by m.motivo
                                   having m.motivo <> 'saude' or count(*) >= v_minimo) mm)
             )), '[]')
        from (select sinalizado_previamente, count(*) as n from respondidos group by sinalizado_previamente having count(*) >= v_minimo) g
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.painel_motivos(), public.painel_desligamento(uuid, public.tipo_desligamento, date) to authenticated;
grant execute on function public.registrar_leitura_questionario(uuid) to authenticated;
