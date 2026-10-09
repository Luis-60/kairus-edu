-- KairusEdu: complemento de DEMONSTRAÇÃO das etapas A a D para um banco que já recebeu o seed base.
-- Idempotente: pode ser executado mais de uma vez. Dados 100% fictícios.
-- Uso: npx supabase db query --linked -f supabase/demo/complemento-etapas-a-d.sql

-- Conta da equipe de apoio (senha de demonstração: KairusDemo2026)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated',
       'apoio@demo.kairusedu.dev', extensions.crypt('KairusDemo2026', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''
where exists (select 1 from public.instituicoes where id = '00000000-0000-4000-8000-000000000001')
  and not exists (select 1 from auth.users where email = 'apoio@demo.kairusedu.dev');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.email = 'apoio@demo.kairusedu.dev' and not exists (select 1 from auth.identities i where i.user_id = u.id);

insert into public.perfis (id, instituicao_id, papel, nome, ve_respostas_desligamento)
select u.id, '00000000-0000-4000-8000-000000000001', 'apoio', 'Marina Lopes', true
from auth.users u where u.email = 'apoio@demo.kairusedu.dev'
on conflict (id) do nothing;

-- Serviços de apoio que a instituição de demonstração oferece
insert into public.servicos_apoio (instituicao_id, nome, descricao, categoria, contato, ordem)
select '00000000-0000-4000-8000-000000000001', v.nome, v.descricao, v.categoria::public.categoria_servico, v.contato, v.ordem
from (values
  ('Bolsas e renegociação', 'Bolsas de permanência, renegociação de parcelas e plano de pagamento.', 'financeiro', 'Setor financeiro, bloco A', 1),
  ('Monitoria e tutoria', 'Monitoria por disciplina e tutoria de acolhimento com professores.', 'academico', 'Coordenação do curso', 2),
  ('Atendimento psicológico', 'Acolhimento psicológico gratuito e sigiloso para estudantes.', 'psicologico', 'Núcleo de apoio psicopedagógico', 3),
  ('Ajuste de grade e turno', 'Troca de turno, disciplinas a distância e redução de carga no semestre.', 'horario', 'Secretaria acadêmica', 4),
  ('Orientação de carreira e estágio', 'Orientação profissional, vagas de estágio e preparação para processos seletivos.', 'estagio', 'Central de carreiras', 5)
) v(nome, descricao, categoria, contato, ordem)
where exists (select 1 from public.instituicoes where id = '00000000-0000-4000-8000-000000000001')
on conflict (instituicao_id, nome) do nothing;

-- Pedido de trancamento aberto do estudante de demonstração (o questionário nasce pendente)
insert into public.pedidos_desligamento (instituicao_id, estudante_id, tipo, status, aberto_em)
select e.instituicao_id, e.id, 'trancamento', 'aberto', timestamptz '2026-10-05 10:00'
from public.estudantes e
where e.codigo = 'A04112'
  and not exists (select 1 from public.pedidos_desligamento p where p.estudante_id = e.id and p.status = 'aberto');

-- Perfis de carreira fictícios (alunos sem conta), só se ainda não houver nenhum
do $$
begin
  if exists (select 1 from public.perfis_profissionais pp join public.estudantes e on e.id = pp.estudante_id
             where e.instituicao_id = '00000000-0000-4000-8000-000000000001' and e.perfil_id is null) then
    raise notice 'Perfis de carreira de demonstração já existem; nada a fazer.';
    return;
  end if;
  create temp table seed_carreira on commit drop as
  select e.id, e.instituicao_id, c.nome as curso, row_number() over (order by e.id) as n
  from public.estudantes e join public.cursos c on c.id = e.curso_id
  where e.situacao = 'ativo' and e.perfil_id is null and e.instituicao_id = '00000000-0000-4000-8000-000000000001'
    and (hashtext(e.id::text) % 5) = 0;

  insert into public.perfis_profissionais (estudante_id, instituicao_id, tipo_vaga, area_interesse, email_contato, telefone)
  select id, instituicao_id,
         (array['estagio', 'estagio', 'estagio', 'emprego', 'trainee'])[1 + n % 5],
         case curso
           when 'Análise e Desenvolvimento de Sistemas' then (array['Desenvolvimento web', 'Suporte técnico', 'Dados'])[1 + n % 3]
           when 'Engenharia de Produção' then (array['Qualidade', 'Logística', 'Melhoria contínua'])[1 + n % 3]
           when 'Administração' then (array['Finanças', 'Recursos humanos', 'Marketing'])[1 + n % 3]
           when 'Logística' then 'Logística'
           else (array['Educação', 'Saúde', 'Atendimento'])[1 + n % 3] end,
         case when n % 3 <> 0 then 'aluno' || n || '@exemplo.com' end,
         case when n % 3 <> 0 then '(24) 90000-0000' end
  from seed_carreira;

  insert into public.experiencias (estudante_id, instituicao_id, tipo, cargo, atividades)
  select id, instituicao_id, (array['informal', 'atividade', 'estagio', 'voluntario'])[1 + n % 4]::public.tipo_experiencia,
         'Experiência de demonstração', 'Atividade fictícia criada para os indicadores agregados.'
  from seed_carreira where n % 4 <> 0;

  insert into public.habilidades (estudante_id, instituicao_id, nome, categoria, origem, status)
  select sc.id, sc.instituicao_id, h.nome, h.categoria::public.categoria_habilidade, 'aluno', 'confirmada'
  from seed_carreira sc
  cross join lateral (
    select * from (values
      ('Excel', 'tecnica'), ('Comunicação', 'comportamental'), ('Trabalho em equipe', 'comportamental'),
      ('Atendimento ao cliente', 'comportamental'), ('Pacote Office', 'tecnica'),
      ('Python', 'tecnica'), ('SQL', 'tecnica'), ('Git', 'tecnica'), ('Organização', 'comportamental')
    ) v(nome, categoria)
    where (v.nome in ('Python', 'SQL', 'Git') and sc.curso = 'Análise e Desenvolvimento de Sistemas' and (hashtext(v.nome || sc.id) % 3) <> 0)
       or (v.nome not in ('Python', 'SQL', 'Git') and (hashtext(v.nome || sc.id) % 2) = 0)
  ) h;

  insert into public.analises_vaga (estudante_id, instituicao_id, origem, titulo, resultado)
  select id, instituicao_id, 'colada', 'Vaga de demonstração',
         jsonb_build_object('cargo', 'Vaga de demonstração', 'aderencia', 50, 'recomendacao', '',
           'requisitos', jsonb_build_array(
             jsonb_build_object('nome', case when curso = 'Análise e Desenvolvimento de Sistemas' then 'Git' else 'Power BI' end,
                                'tipo', 'obrigatorio', 'situacao', 'nao_confirmado', 'evidencias', '[]'::jsonb, 'comentario', ''),
             jsonb_build_object('nome', 'Inglês intermediário', 'tipo', 'desejavel',
                                'situacao', case when n % 2 = 0 then 'nao_confirmado' else 'confirmado' end, 'evidencias', '[]'::jsonb, 'comentario', '')))
  from seed_carreira where n % 2 = 0;

  insert into public.curriculo_versoes (estudante_id, instituicao_id, titulo, conteudo, storage_path)
  select id, instituicao_id, 'Currículo geral', '{}'::jsonb, 'demonstracao/sem-arquivo.pdf'
  from seed_carreira where n % 3 <> 0;
end;
$$;
