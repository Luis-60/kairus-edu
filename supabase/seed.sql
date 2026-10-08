-- KairusEdu: dados 100% fictícios para desenvolvimento local.
-- Nenhum registro corresponde a uma pessoa real. Senha de todas as contas: KairusDemo2026
--
-- Contas:
--   gestor@demo.kairusedu.dev          Gestão, Universidade Demonstração
--   coordenador@demo.kairusedu.dev     Coordenação de Engenharia de Produção
--   coordenador.direito@demo.kairusedu.dev  Coordenação de Direito
--   estudante@demo.kairusedu.dev       Estudante A04112
--   gestor@outra.kairusedu.dev         Gestão de outra instituição (teste de isolamento)

select setseed(0.42);

-- ---------------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------------
create temp table seed_usuarios (id uuid, email text, nome text, papel public.papel_usuario, inst uuid);
insert into seed_usuarios values
  ('10000000-0000-4000-8000-000000000001', 'gestor@demo.kairusedu.dev', 'Helena Prado', 'gestor', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'coordenador@demo.kairusedu.dev', 'Rafael Antunes', 'coordenador', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', 'coordenador.direito@demo.kairusedu.dev', 'Patrícia Gomes', 'coordenador', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000004', 'estudante@demo.kairusedu.dev', 'Estudante Demonstração', 'estudante', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000005', 'gestor@outra.kairusedu.dev', 'Gestão Outra Instituição', 'gestor', '00000000-0000-4000-8000-000000000002');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('KairusDemo2026', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', '', '', '', '', ''
from seed_usuarios u;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from seed_usuarios u;

-- ---------------------------------------------------------------------------
-- Instituições, perfis, cursos, períodos
-- ---------------------------------------------------------------------------
insert into public.instituicoes (id, nome, sigla) values
  ('00000000-0000-4000-8000-000000000001', 'Universidade Demonstração', 'UDEMO'),
  ('00000000-0000-4000-8000-000000000002', 'Faculdade Isolamento', 'FISO');

insert into public.perfis (id, instituicao_id, papel, nome)
select u.id, u.inst, u.papel, u.nome from seed_usuarios u;

create temp table seed_cursos (nome text, modalidade public.modalidade_curso, total smallint, taxa numeric);
insert into seed_cursos values
  ('Análise e Desenvolvimento de Sistemas', 'ead', 6, 26.4),
  ('Gestão de Recursos Humanos', 'ead', 4, 25.7),
  ('Logística', 'ead', 4, 25.4),
  ('Matemática', 'ead', 8, 24.2),
  ('Pedagogia', 'ead', 8, 23.5),
  ('Engenharia de Produção', 'presencial', 10, 20.9),
  ('Direito', 'presencial', 10, 19.4),
  ('Enfermagem', 'presencial', 10, 18.2),
  ('Administração', 'presencial', 8, 16.4);

insert into public.cursos (instituicao_id, nome, modalidade, total_periodos)
select '00000000-0000-4000-8000-000000000001', c.nome, c.modalidade, c.total from seed_cursos c;

insert into public.coordenacoes_curso (perfil_id, curso_id, instituicao_id)
select '10000000-0000-4000-8000-000000000002'::uuid, c.id, c.instituicao_id from public.cursos c where c.nome = 'Engenharia de Produção'
union all
select '10000000-0000-4000-8000-000000000003'::uuid, c.id, c.instituicao_id from public.cursos c where c.nome = 'Direito';

insert into public.periodos_letivos (instituicao_id, codigo, inicio, fim, encerrado) values
  ('00000000-0000-4000-8000-000000000001', '2024.1', '2024-02-01', '2024-07-15', true),
  ('00000000-0000-4000-8000-000000000001', '2024.2', '2024-08-01', '2024-12-15', true),
  ('00000000-0000-4000-8000-000000000001', '2025.1', '2025-02-01', '2025-07-15', true),
  ('00000000-0000-4000-8000-000000000001', '2025.2', '2025-08-01', '2025-12-15', true),
  ('00000000-0000-4000-8000-000000000001', '2026.1', '2026-02-01', '2026-07-15', true),
  ('00000000-0000-4000-8000-000000000001', '2026.2', '2026-08-01', '2026-12-15', false);

-- ---------------------------------------------------------------------------
-- Simulação de trajetórias (2024.1 a 2026.1 encerrados, 2026.2 em andamento)
-- ---------------------------------------------------------------------------
do $$
declare
  v_inst constant uuid := '00000000-0000-4000-8000-000000000001';
  -- Peso relativo da evasão por período do curso (1º ao 8º; acima disso usa o 8º).
  v_peso_periodo constant numeric[] := array[1.16, 0.98, 0.93, 1.00, 0.98, 1.07, 0.75, 1.12];
  v_seq int := 10000;
  v_sem record;
  v_curso record;
  v_aluno record;
  v_id uuid;
  v_per int;
  v_prob numeric;
  v_sorteio numeric;
  v_sit public.situacao_estudante;
begin
  create temp table sim (
    id uuid primary key, curso_id uuid, total int, taxa numeric, periodo int, ativo boolean
  );

  for v_sem in
    select * from public.periodos_letivos where instituicao_id = v_inst order by inicio
  loop
    -- Estoque inicial em 2024.1; ingressantes nos semestres seguintes.
    for v_curso in
      select c.id, c.total_periodos, sc.taxa from public.cursos c join seed_cursos sc on sc.nome = c.nome
      where c.instituicao_id = v_inst
    loop
      for i in 1..(case when v_sem.codigo = '2024.1' then 92 else 24 end) loop
        v_seq := v_seq + 1;
        v_per := case when v_sem.codigo = '2024.1'
                      then 1 + floor(random() * least(v_curso.total_periodos, 8))::int
                      else 1 end;
        insert into public.estudantes (instituicao_id, curso_id, codigo, periodo_atual)
        values (v_inst, v_curso.id, 'A' || v_seq::text, v_per)
        returning id into v_id;
        insert into sim values (v_id, v_curso.id, v_curso.total_periodos, v_curso.taxa, v_per, true);
      end loop;
    end loop;

    insert into public.vinculos_periodo (instituicao_id, estudante_id, periodo_letivo_id, periodo_curso)
    select v_inst, s.id, v_sem.id, s.periodo from sim s where s.ativo;

    if v_sem.encerrado then
      for v_aluno in select * from sim where ativo loop
        v_prob := v_aluno.taxa / 100.0 * v_peso_periodo[least(v_aluno.periodo, 8)];
        v_sorteio := random();
        if v_sorteio < v_prob then
          v_sit := case
            when v_sorteio < v_prob * 0.45 then 'cancelado'
            when v_sorteio < v_prob * 0.75 then 'trancado'
            else 'evadido' end;
          update sim set ativo = false where id = v_aluno.id;
          update public.estudantes set situacao = v_sit, periodo_atual = v_aluno.periodo where id = v_aluno.id;
        elsif v_aluno.periodo >= v_aluno.total then
          v_sit := 'formado';
          update sim set ativo = false where id = v_aluno.id;
          update public.estudantes set situacao = v_sit, periodo_atual = v_aluno.periodo where id = v_aluno.id;
        else
          v_sit := 'ativo';
          update sim set periodo = periodo + 1 where id = v_aluno.id;
        end if;
        update public.vinculos_periodo set situacao_final = v_sit
         where estudante_id = v_aluno.id and periodo_letivo_id = v_sem.id;
      end loop;
    end if;
  end loop;

  update public.estudantes e set periodo_atual = s.periodo from sim s where s.id = e.id and s.ativo;
  -- Vínculo do período corrente reflete o período após a progressão.
  update public.vinculos_periodo vp set periodo_curso = s.periodo
    from sim s, public.periodos_letivos pl
   where vp.estudante_id = s.id and s.ativo and pl.id = vp.periodo_letivo_id and not pl.encerrado;
end;
$$;

-- ---------------------------------------------------------------------------
-- Estudantes que aparecem no protótipo (Engenharia de Produção, 2026.2)
-- ---------------------------------------------------------------------------
create temp table seed_destaques (
  codigo text, periodo int, prob numeric, faixa public.faixa_risco, fatores jsonb,
  acao text, acao_desc text, freq numeric, cr numeric
);
insert into seed_destaques values
  ('A04112', 2, 0.78, 'alto', '[{"fator":"Queda de frequência","peso":0.82},{"fator":"Reprovações acumuladas","peso":0.60},{"fator":"Parcelas em atraso","peso":0.44}]',
   'Conversa individual com a coordenação', 'Entender a queda de frequência e apresentar o apoio financeiro disponível.', 68, 6.4),
  ('A03987', 1, 0.71, 'alto', '[{"fator":"Dias sem atividade no ambiente virtual","peso":0.78},{"fator":"Entregas atrasadas","peso":0.66},{"fator":"Nota da primeira avaliação","peso":0.40}]',
   'Tutoria de acolhimento', 'Contato do tutor e plano de recuperação das entregas.', 71, 5.9),
  ('A04250', 4, 0.64, 'alto', '[{"fator":"Parcelas em atraso","peso":0.74},{"fator":"Queda de frequência","peso":0.51},{"fator":"Trancamento anterior","peso":0.38}]',
   'Encaminhar ao apoio financeiro', 'Verificar renegociação e bolsas de permanência.', 73, 6.8),
  ('A03544', 3, 0.46, 'atencao', '[{"fator":"Nota da primeira avaliação","peso":0.58},{"fator":"Entregas atrasadas","peso":0.42},{"fator":"Carga de trabalho semanal","peso":0.30}]',
   'Monitoria da disciplina', 'Indicar monitoria e rever a carga de disciplinas.', 80, 6.1),
  ('A04031', 6, 0.41, 'atencao', '[{"fator":"Carga de trabalho semanal","peso":0.55},{"fator":"Queda de frequência","peso":0.36},{"fator":"Distância do campus","peso":0.22}]',
   'Ajuste de grade', 'Oferecer turno alternativo ou disciplinas a distância.', 79, 7.2),
  ('A03820', 5, 0.12, 'baixo', '[{"fator":"Frequência estável","peso":0.20},{"fator":"Entregas em dia","peso":0.15},{"fator":"Atividade extracurricular","peso":0.10}]',
   'Sem ação necessária', 'Manter acompanhamento de rotina.', 94, 8.3);

do $$
declare
  v_inst constant uuid := '00000000-0000-4000-8000-000000000001';
  v_curso uuid := (select id from public.cursos where instituicao_id = v_inst and nome = 'Engenharia de Produção');
  v_d record;
  v_id uuid;
  v_pl record;
  v_k int;
begin
  for v_d in select * from seed_destaques loop
    insert into public.estudantes (instituicao_id, curso_id, codigo, periodo_atual, perfil_id)
    values (v_inst, v_curso, v_d.codigo, v_d.periodo,
            case when v_d.codigo = 'A04112' then '10000000-0000-4000-8000-000000000004'::uuid end)
    returning id into v_id;

    -- Histórico: períodos anteriores cursados nos semestres encerrados mais recentes.
    v_k := 0;
    for v_pl in
      select * from public.periodos_letivos where instituicao_id = v_inst order by inicio desc
    loop
      exit when v_d.periodo - v_k < 1;
      insert into public.vinculos_periodo (instituicao_id, estudante_id, periodo_letivo_id, periodo_curso, situacao_final)
      values (v_inst, v_id, v_pl.id, v_d.periodo - v_k, case when v_pl.encerrado then 'ativo'::public.situacao_estudante end);
      v_k := v_k + 1;
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Avaliações de risco (2026.1 e 2026.2) e indicadores acadêmicos
-- ---------------------------------------------------------------------------
create temp table seed_fatores (fator text, acao text, acao_desc text);
insert into seed_fatores values
  ('Queda de frequência nas 4 primeiras semanas', 'Conversa individual com a coordenação', 'Entender a queda de frequência e combinar um plano de retorno.'),
  ('Dias sem atividade no ambiente virtual', 'Tutoria de acolhimento', 'Contato ativo do tutor e plano de recuperação das atividades.'),
  ('Entregas atrasadas', 'Tutoria de acolhimento', 'Contato do tutor e plano de recuperação das entregas.'),
  ('Nota da primeira avaliação', 'Monitoria da disciplina', 'Indicar monitoria e acompanhar a próxima avaliação.'),
  ('Reprovações acumuladas', 'Ajuste de grade', 'Rever a carga de disciplinas do próximo período.'),
  ('Parcelas em atraso', 'Encaminhar ao apoio financeiro', 'Verificar renegociação e bolsas de permanência.'),
  ('Trancamentos anteriores', 'Conversa individual com a coordenação', 'Entender o histórico e apresentar os apoios disponíveis.');

insert into public.avaliacoes_risco (
  instituicao_id, estudante_id, periodo_letivo_id, probabilidade, faixa, fatores,
  acao_sugerida, acao_sugerida_descricao, modelo_versao, gerada_em
)
select r.instituicao_id, r.estudante_id, r.periodo_letivo_id,
       round((case r.faixa
         when 'alto' then 0.60 + random() * 0.25
         when 'atencao' then 0.35 + random() * 0.24
         else 0.03 + random() * 0.30 end)::numeric, 4),
       r.faixa, f.fatores, sf.acao, sf.acao_desc,
       'demo-2026.1', r.gerada_em
from (
  select b.*,
         case when b.pr < (case when b.encerrado then 0.09 else 0.10 end) * b.taxa / 21 then 'alto'::public.faixa_risco
              when b.pr < (case when b.encerrado then 0.28 else 0.30 end) * b.taxa / 21 then 'atencao'::public.faixa_risco
              else 'baixo'::public.faixa_risco end as faixa
  from (
    select vp.instituicao_id, vp.estudante_id, vp.periodo_letivo_id, pl.encerrado,
           pl.inicio + 30 as gerada_em, sc.taxa,
           -- Faixas distribuídas por curso, proporcionais à evasão histórica de cada um.
           percent_rank() over (partition by vp.periodo_letivo_id, e.curso_id order by random()) as pr
    from public.vinculos_periodo vp
    join public.periodos_letivos pl on pl.id = vp.periodo_letivo_id and pl.codigo in ('2026.1', '2026.2')
    join public.estudantes e on e.id = vp.estudante_id
    join public.cursos c on c.id = e.curso_id
    join seed_cursos sc on sc.nome = c.nome
    where e.codigo not in (select codigo from seed_destaques) or pl.codigo = '2026.1'
  ) b
) r
cross join lateral (
  select jsonb_agg(jsonb_build_object('fator', x.fator, 'peso', x.peso) order by x.peso desc) as fatores
  from (
    select sf2.fator, round((0.2 + random() * 0.7)::numeric, 2) as peso
    from seed_fatores sf2
    where r.estudante_id is not null
    order by random() limit 3
  ) x
) f
join seed_fatores sf on sf.fator = f.fatores -> 0 ->> 'fator';

insert into public.avaliacoes_risco (
  instituicao_id, estudante_id, periodo_letivo_id, probabilidade, faixa, fatores,
  acao_sugerida, acao_sugerida_descricao, modelo_versao, gerada_em
)
select e.instituicao_id, e.id, pl.id, d.prob, d.faixa, d.fatores, d.acao, d.acao_desc, 'demo-2026.1', pl.inicio + 30
from seed_destaques d
join public.estudantes e on e.codigo = d.codigo
join public.periodos_letivos pl on pl.instituicao_id = e.instituicao_id and pl.codigo = '2026.2';

-- Indicadores do período corrente coerentes com a faixa de risco.
insert into public.indicadores_academicos (
  instituicao_id, estudante_id, periodo_letivo_id, frequencia, coeficiente, disciplinas,
  entregas_atrasadas, creditos_concluidos_pct
)
select vp.instituicao_id, vp.estudante_id, vp.periodo_letivo_id,
       coalesce(d.freq, round((case r.faixa when 'alto' then 55 + random() * 20
                                           when 'atencao' then 66 + random() * 18
                                           else 78 + random() * 20 end)::numeric, 0)),
       coalesce(d.cr, round((case r.faixa when 'alto' then 4.5 + random() * 2
                                         when 'atencao' then 5.5 + random() * 2
                                         else 6.5 + random() * 3 end)::numeric, 1)),
       4 + floor(random() * 3)::int,
       case r.faixa when 'alto' then 1 + floor(random() * 3)::int
                    when 'atencao' then floor(random() * 2)::int
                    else 0 end,
       case when d.codigo = 'A04112' then 18
            else round((100.0 * (e.periodo_atual - 1) / c.total_periodos + random() * 5)::numeric, 0) end
from public.vinculos_periodo vp
join public.periodos_letivos pl on pl.id = vp.periodo_letivo_id and not pl.encerrado
join public.estudantes e on e.id = vp.estudante_id
join public.cursos c on c.id = e.curso_id
left join public.avaliacoes_risco r on r.estudante_id = vp.estudante_id and r.periodo_letivo_id = vp.periodo_letivo_id
left join seed_destaques d on d.codigo = e.codigo;

update public.indicadores_academicos i set disciplinas = 5, entregas_atrasadas = 2
  from public.estudantes e where e.id = i.estudante_id and e.codigo = 'A04112';

-- ---------------------------------------------------------------------------
-- Desligamentos: pedidos concluídos em 2026.1 (com pesquisa) e pedidos abertos em 2026.2
-- ---------------------------------------------------------------------------
insert into public.pedidos_desligamento (instituicao_id, estudante_id, tipo, status, aberto_em, concluido_em)
select vp.instituicao_id, vp.estudante_id,
       case vp.situacao_final when 'trancado' then 'trancamento'::public.tipo_desligamento else 'cancelamento' end,
       'concluido', pl.fim - 40 + floor(random() * 30)::int, pl.fim
from public.vinculos_periodo vp
join public.periodos_letivos pl on pl.id = vp.periodo_letivo_id and pl.codigo = '2026.1'
where vp.situacao_final in ('trancado', 'cancelado');

-- Distribuição dos motivos aproximando a do protótipo (25, 24, 22, 10, 9, 4, restante outro).
insert into public.respostas_desligamento (instituicao_id, pedido_id, motivo_principal, consentimento, respondida_em)
select p.instituicao_id, p.id,
       case when p.s < 0.25 then 'acesso_internet_equipamento'
            when p.s < 0.49 then 'financeira'
            when p.s < 0.71 then 'trabalho_estudo'
            when p.s < 0.81 then 'deslocamento'
            when p.s < 0.90 then 'dificuldade_conteudo'
            when p.s < 0.94 then 'adaptacao_curso'
            else 'outro' end::public.motivo_desligamento,
       true, p.aberto_em + interval '1 day'
-- Distribuição por posição (determinística); 4 de cada 5 pedidos respondem à pesquisa.
from (
  select q.*, (q.n - 1)::numeric / q.total as s
  from (
    select p.*, row_number() over (order by p.id) as n, count(*) over () as total
    from public.pedidos_desligamento p
  ) q
  where q.n % 5 <> 0
) p;

-- Três pedidos abertos na Engenharia de Produção (dois já sinalizados) e alguns em outros cursos.
insert into public.pedidos_desligamento (instituicao_id, estudante_id, tipo, status, aberto_em)
select x.instituicao_id, x.estudante_id, x.tipo, 'aberto', '2026-09-20'::timestamptz + (x.n || ' days')::interval
from (
  select r.instituicao_id, r.estudante_id,
         case when row_number() over () % 2 = 0 then 'trancamento'::public.tipo_desligamento else 'cancelamento' end as tipo,
         row_number() over () as n
  from (
    (select r.instituicao_id, r.estudante_id from public.avaliacoes_risco r
       join public.estudantes e on e.id = r.estudante_id
       join public.cursos c on c.id = e.curso_id and c.nome = 'Engenharia de Produção'
       join public.periodos_letivos pl on pl.id = r.periodo_letivo_id and not pl.encerrado
      where r.faixa <> 'baixo' and e.codigo not in (select codigo from seed_destaques)
      order by r.probabilidade desc offset 2 limit 2)
    union all
    (select r.instituicao_id, r.estudante_id from public.avaliacoes_risco r
       join public.estudantes e on e.id = r.estudante_id
       join public.cursos c on c.id = e.curso_id and c.nome = 'Engenharia de Produção'
       join public.periodos_letivos pl on pl.id = r.periodo_letivo_id and not pl.encerrado
      where r.faixa = 'baixo' and e.codigo not in (select codigo from seed_destaques)
      order by r.estudante_id limit 1)
    union all
    (select r.instituicao_id, r.estudante_id from public.avaliacoes_risco r
       join public.estudantes e on e.id = r.estudante_id
       join public.cursos c on c.id = e.curso_id and c.nome <> 'Engenharia de Produção'
       join public.periodos_letivos pl on pl.id = r.periodo_letivo_id and not pl.encerrado
      where r.faixa = 'alto'
      order by r.probabilidade desc limit 6)
  ) r
) x;

insert into public.respostas_desligamento (instituicao_id, pedido_id, motivo_principal, consentimento, respondida_em)
select p.instituicao_id, p.id,
       (array['financeira', 'trabalho_estudo', 'acesso_internet_equipamento']::public.motivo_desligamento[])[1 + (row_number() over (order by p.aberto_em))::int % 3],
       true, p.aberto_em + interval '1 day'
from public.pedidos_desligamento p
where p.status = 'aberto'
order by p.aberto_em
limit 5;

-- ---------------------------------------------------------------------------
-- Ações de permanência
-- ---------------------------------------------------------------------------
insert into public.acoes_permanencia (
  instituicao_id, estudante_id, tipo, descricao, responsavel_id, prazo, status, criada_por, created_at
)
select r.instituicao_id, r.estudante_id,
       case r.acao_sugerida
         when 'Tutoria de acolhimento' then 'tutoria'
         when 'Monitoria da disciplina' then 'monitoria'
         when 'Encaminhar ao apoio financeiro' then 'apoio_financeiro'
         when 'Ajuste de grade' then 'ajuste_grade'
         else 'conversa_individual' end::public.tipo_acao,
       r.acao_sugerida_descricao,
       coalesce(cc.perfil_id, '10000000-0000-4000-8000-000000000001'),
       date '2026-09-01' + floor(random() * 50)::int,
       (array['pendente', 'em_andamento', 'concluida']::public.status_acao[])[1 + floor(random() * 3)::int],
       coalesce(cc.perfil_id, '10000000-0000-4000-8000-000000000001'),
       timestamptz '2026-08-25' + (floor(random() * 30) || ' days')::interval
from public.avaliacoes_risco r
join public.periodos_letivos pl on pl.id = r.periodo_letivo_id and not pl.encerrado
join public.estudantes e on e.id = r.estudante_id
left join public.coordenacoes_curso cc on cc.curso_id = e.curso_id
where r.faixa = 'alto'
  and e.codigo not in (select codigo from seed_destaques)
  and random() < 0.55;

-- No protótipo, A03987 e A03544 já têm ação registrada.
insert into public.acoes_permanencia (
  instituicao_id, estudante_id, tipo, descricao, responsavel_id, prazo, status, criada_por, created_at
)
select e.instituicao_id, e.id, x.tipo, d.acao_desc,
       '10000000-0000-4000-8000-000000000002', date '2026-10-10', 'em_andamento',
       '10000000-0000-4000-8000-000000000002', timestamptz '2026-09-28'
from seed_destaques d
join public.estudantes e on e.codigo = d.codigo
join (values ('A03987', 'tutoria'::public.tipo_acao), ('A03544', 'monitoria'::public.tipo_acao)) x(codigo, tipo)
  on x.codigo = d.codigo;

-- ---------------------------------------------------------------------------
-- Insights exibidos à gestão
-- ---------------------------------------------------------------------------
insert into public.insights (instituicao_id, contexto, categoria, texto, acao_sugerida, ordem) values
  ('00000000-0000-4000-8000-000000000001', 'visao_geral', 'Motivos declarados',
   'Três motivos somam 71% das respostas e nenhum deles é acadêmico. Apoio de permanência tende a alcançar mais alunos que reforço de conteúdo.', null, 1),
  ('00000000-0000-4000-8000-000000000001', 'inteligencia', 'Modalidade',
   'Cursos a distância apresentam mais que o dobro da evasão dos presenciais.',
   'Contato ativo de tutoria na terceira semana sem acesso.', 1),
  ('00000000-0000-4000-8000-000000000001', 'inteligencia', 'Momento da jornada',
   'O risco é maior no 1º período e volta a subir no 8º, perto da conclusão.',
   'Acolhimento no ingresso e apoio ao trabalho final.', 2),
  ('00000000-0000-4000-8000-000000000001', 'inteligencia', 'Motivos declarados',
   'Acesso a equipamento, dificuldade financeira e conciliação com o trabalho somam 71% das respostas.',
   'Priorizar apoio de permanência antes de reforço de conteúdo.', 3);

-- ---------------------------------------------------------------------------
-- Outra instituição (para verificar o isolamento por RLS)
-- ---------------------------------------------------------------------------
insert into public.cursos (instituicao_id, nome, modalidade, total_periodos)
values ('00000000-0000-4000-8000-000000000002', 'Ciências Contábeis', 'presencial', 8);

insert into public.periodos_letivos (instituicao_id, codigo, inicio, fim, encerrado)
values ('00000000-0000-4000-8000-000000000002', '2026.2', '2026-08-01', '2026-12-15', false);

insert into public.estudantes (instituicao_id, curso_id, codigo, periodo_atual)
select '00000000-0000-4000-8000-000000000002', c.id, 'F' || (9000 + g)::text, 1 + g % 8
from public.cursos c, generate_series(1, 5) g
where c.instituicao_id = '00000000-0000-4000-8000-000000000002';


-- ---------------------------------------------------------------------------
-- Carreira e estágio (Engenharia de Produção). Empresas e vagas fictícias.
-- ---------------------------------------------------------------------------
do $$
declare
  v_inst constant uuid := '00000000-0000-4000-8000-000000000001';
  v_curso uuid := (select id from public.cursos where instituicao_id = v_inst and nome = 'Engenharia de Produção');
  v_estudante uuid := (select id from public.estudantes where codigo = 'A04112');
  v_vaga uuid;
  v_area uuid;
  r record;
begin
  insert into public.competencias (instituicao_id, nome)
  select v_inst, n from unnest(array[
    'Mapeamento de processos', 'Excel', '5S', 'Estatística básica', 'Ferramentas Lean', 'Trabalho em equipe',
    'Planejamento da produção', 'Gestão de estoques', 'Sistema ERP', 'Indicadores logísticos',
    'Ferramentas da qualidade', 'Noções de ISO 9001', 'Controle estatístico de processo',
    'Comunicação', 'Raciocínio quantitativo'
  ]) n;

  -- Competências reconhecidas do estudante A04112 (protótipo: Minhas competências).
  insert into public.estudante_competencias (estudante_id, competencia_id, instituicao_id, nivel, progresso, origem)
  select v_estudante, c.id, v_inst, x.nivel::public.nivel_competencia, x.progresso, x.origem
  from (values
    ('Mapeamento de processos', 'tem', 70, 'Introdução à Engenharia de Produção'),
    ('Raciocínio quantitativo', 'tem', 55, 'Cálculo I e Estatística'),
    ('Ferramentas da qualidade', 'desenvolvendo', 50, 'Projeto integrador'),
    ('Comunicação', 'tem', 65, 'Atividades em grupo'),
    ('Trabalho em equipe', 'tem', 65, 'Atividades em grupo'),
    ('Excel', 'tem', 45, 'Informática aplicada'),
    ('5S', 'tem', 40, 'Projeto integrador'),
    ('Estatística básica', 'desenvolvendo', 35, 'Estatística'),
    ('Gestão de estoques', 'desenvolvendo', 20, 'Introdução à Engenharia de Produção')
  ) x(nome, nivel, progresso, origem)
  join public.competencias c on c.instituicao_id = v_inst and c.nome = x.nome;

  insert into public.empresas (instituicao_id, nome, setor, areas, cidade, distancia_campus_km) values
    (v_inst, 'Siderúrgica Vale do Aço', 'Siderurgia', 'Melhoria contínua, qualidade e manutenção', 'Volta Redonda, RJ', 4),
    (v_inst, 'Cimentos Sul Fluminense', 'Materiais de construção', 'Qualidade e processos', 'Volta Redonda, RJ', 7),
    (v_inst, 'Centro de Distribuição Dutra', 'Logística', 'Armazenagem, transporte e estoques', 'Barra Mansa, RJ', 12),
    (v_inst, 'Metalúrgica Barra Mansa', 'Metalurgia', 'PCP e segurança do trabalho', 'Barra Mansa, RJ', 14),
    (v_inst, 'Autopeças Paraíba do Sul', 'Automotivo', 'PCP, logística e qualidade', 'Resende, RJ', 45),
    (v_inst, 'Montadora Agulhas Negras', 'Automotivo', 'Engenharia de processos e Lean', 'Resende, RJ', 52);

  for r in
    select * from (values
      ('Siderúrgica Vale do Aço', 'Estágio em Melhoria Contínua', 'Volta Redonda, RJ', 3, '6 horas por dia',
       'Apoiar projetos de melhoria na laminação. Coletar dados de processo, atualizar indicadores e participar de eventos kaizen com a equipe de operação.',
       array['Mapeamento de processos', 'Excel', '5S', 'Estatística básica', 'Ferramentas Lean']),
      ('Autopeças Paraíba do Sul', 'Estágio em PCP', 'Resende, RJ', 4, '6 horas por dia',
       'Acompanhar a programação de produção, conferir ordens e estoques intermediários e apoiar o planejamento semanal das linhas de montagem.',
       array['Excel', 'Trabalho em equipe', 'Planejamento da produção', 'Gestão de estoques', 'Sistema ERP']),
      ('Centro de Distribuição Dutra', 'Estágio em Logística', 'Barra Mansa, RJ', 2, '4 horas por dia',
       'Apoiar o controle de recebimento e expedição, acompanhar indicadores de entrega e propor melhorias no layout do armazém.',
       array['Excel', 'Mapeamento de processos', 'Gestão de estoques', 'Indicadores logísticos']),
      ('Cimentos Sul Fluminense', 'Estágio em Qualidade', 'Volta Redonda, RJ', 3, '6 horas por dia',
       'Apoiar o controle de qualidade, registrar não conformidades, acompanhar auditorias internas e manter os procedimentos atualizados.',
       array['5S', 'Ferramentas da qualidade', 'Noções de ISO 9001', 'Controle estatístico de processo'])
    ) t(empresa, titulo, cidade, periodo, carga, descricao, comps)
  loop
    insert into public.vagas (instituicao_id, empresa_id, curso_id, titulo, descricao, cidade, periodo_minimo, carga_horaria)
    values (v_inst, (select id from public.empresas where instituicao_id = v_inst and nome = r.empresa), v_curso,
            r.titulo, r.descricao, r.cidade, r.periodo, r.carga)
    returning id into v_vaga;
    insert into public.vaga_competencias (vaga_id, competencia_id, instituicao_id)
    select v_vaga, c.id, v_inst from public.competencias c where c.instituicao_id = v_inst and c.nome = any (r.comps);
  end loop;

  insert into public.trilha_carreira_etapas (instituicao_id, curso_id, periodo, titulo, descricao, entrega) values
    (v_inst, v_curso, 1, 'Autoconhecimento', 'Conheça as áreas da profissão e descubra seus interesses.', 'Perfil profissional preenchido'),
    (v_inst, v_curso, 2, 'Ferramentas básicas', 'Excel, comunicação escrita e organização de estudos.', 'Certificado de Excel básico'),
    (v_inst, v_curso, 3, 'Primeiro currículo', 'Monte o currículo com IA e crie seu perfil profissional online.', 'Currículo revisado'),
    (v_inst, v_curso, 4, 'Prática', 'Projeto de extensão, empresa júnior ou monitoria.', 'Uma experiência registrada'),
    (v_inst, v_curso, 5, 'Processo seletivo', 'Treino de entrevista, dinâmica de grupo e testes online.', 'Simulado de entrevista'),
    (v_inst, v_curso, 6, 'Estágio obrigatório', 'Candidaturas, termo de compromisso e início do estágio.', 'Contrato de estágio assinado');

  for r in
    select * from (values
      (1, 'Qualidade', 'Garante que produtos e serviços atendam aos requisitos. É porta de entrada frequente para estágio na indústria.',
       array['Fundamentos|Conceitos de qualidade, 5S e as sete ferramentas.', 'Normas|Noções de ISO 9001 e gestão por processos.',
             'Estatística|Controle estatístico de processo e capacidade.', 'Prática|Auditoria interna simulada e tratamento de não conformidade.']),
      (2, 'Logística', 'Cuida do fluxo de materiais do fornecedor ao cliente. Tem muitas vagas em centros de distribuição da região.',
       array['Fundamentos|Cadeia de suprimentos, modais e armazenagem.', 'Estoques|Curva ABC, inventário e ponto de pedido.',
             'Indicadores|Nível de serviço, giro e custo logístico.', 'Prática|Estudo de layout de um armazém.']),
      (3, 'PCP', 'Planeja o que, quanto e quando produzir. Exige raciocínio com números e visão do processo inteiro.',
       array['Fundamentos|Sistemas de produção e previsão de demanda.', 'Planejamento|Plano mestre, MRP e capacidade.',
             'Programação|Sequenciamento, Kanban e controle de ordens.', 'Prática|Simulação de programação em planilha.']),
      (4, 'Melhoria contínua', 'Reduz desperdícios e resolve problemas com método.',
       array['Fundamentos Lean|Os sete desperdícios e o pensamento enxuto.', 'Ferramentas|Mapa de fluxo de valor, kaizen e trabalho padronizado.',
             'Solução de problemas|PDCA, A3 e análise de causa raiz.', 'Prática|Projeto de melhoria em um processo real.']),
      (5, 'Dados e pesquisa operacional', 'Usa modelos e dados para apoiar decisões. Cresce junto com a digitalização das fábricas.',
       array['Planilhas avançadas|Tabelas dinâmicas e funções de busca.', 'Estatística aplicada|Descritiva, correlação e regressão.',
             'Otimização|Programação linear e simulação.', 'Prática|Painel de indicadores com dados reais.'])
    ) t(ordem, nome, descricao, passos)
  loop
    insert into public.areas_atuacao (instituicao_id, curso_id, nome, descricao, ordem)
    values (v_inst, v_curso, r.nome, r.descricao, r.ordem) returning id into v_area;
    insert into public.area_passos (instituicao_id, area_id, ordem, titulo, descricao)
    select v_inst, v_area, p.ordinality, split_part(p.passo, '|', 1), split_part(p.passo, '|', 2)
    from unnest(r.passos) with ordinality p(passo, ordinality);
  end loop;

  -- Métricas do modelo de demonstração (base simulada, conforme o protótipo).
  insert into public.metricas_modelo (instituicao_id, modelo_versao, momento, auc, captura_top20, periodo_treino, periodo_teste, base_simulada) values
    (v_inst, 'demo-2026.1', 'matricula', 0.75, 45, '2024.1 a 2025.2', '2026.1', true),
    (v_inst, 'demo-2026.1', 'quatro_semanas', 0.85, 62, '2024.1 a 2025.2', '2026.1', true);
end;
$$;

-- Os triggers de auditoria registram as inserções do seed; a trilha começa limpa.
delete from public.audit_log;
