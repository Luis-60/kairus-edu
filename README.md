# KairusEdu

Plataforma B2B de permanência estudantil. Transforma sinais de evasão em ações de permanência para três perfis: gestão, coordenação de curso e estudante. A interface segue o protótipo "Permanência Estudantil" (cores, tipografia Manrope, sidebar navy e painéis).

Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, RLS), React Hook Form + Zod.

## Como rodar localmente

Pré-requisitos: Node 20.9+, pnpm e Docker.

```bash
pnpm install
pnpm db:start          # sobe o Supabase local (Docker)
pnpm db:reset          # aplica as migrations e o seed fictício
cp .env.example .env.local   # preencha com os valores de `pnpm exec supabase status`
pnpm dev
```

Contas de demonstração (dados 100% fictícios). A senha de todas é `KairusDemo2026`:

| E-mail | Papel |
|---|---|
| gestor@demo.kairusedu.dev | Gestão, Universidade Demonstração |
| coordenador@demo.kairusedu.dev | Coordenação de Engenharia de Produção |
| coordenador.direito@demo.kairusedu.dev | Coordenação de Direito |
| estudante@demo.kairusedu.dev | Estudante (matrícula A04112) |
| gestor@outra.kairusedu.dev | Gestão de outra instituição (teste de isolamento) |
| apoio@demo.kairusedu.dev | Equipe de apoio ao estudante (lê respostas individuais, exceto saúde) |

Os e-mails locais (recuperação de senha) aparecem no Mailpit, em http://127.0.0.1:54324.

## Dados de demonstração em um banco já existente

Se o banco remoto recebeu o seed antes das etapas A–D, aplique o complemento (idempotente):

```bash
npx supabase db query --linked -f supabase/demo/complemento-etapas-a-d.sql
```

Ele cria a conta `apoio@demo.kairusedu.dev`, os serviços de apoio, o pedido aberto do aluno A04112 e perfis de carreira fictícios para o painel de empregabilidade.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL da API do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável. É pública por definição; o acesso é controlado por RLS |
| `NEXT_PUBLIC_SITE_URL` | URL pública da aplicação |
| `OPENROUTER_API_KEY` | Chave do OpenRouter para as funções de IA. **Somente servidor**; sem ela, as funções de IA mostram "IA não configurada" e o resto funciona |
| `AI_MODEL` | Modelo usado pela IA (ID do OpenRouter). Padrão: `anthropic/claude-opus-5.5` |

A aplicação não usa a chave secreta (service role) do Supabase. A chave do OpenRouter é lida apenas em código de servidor; nenhum segredo vai para o frontend.

## Scripts

| Script | O que faz |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Desenvolvimento, build e produção |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript |
| `pnpm db:start` / `pnpm db:stop` | Sobe ou para o Supabase local (inclui o Storage, usado pelos currículos) |
| `pnpm db:reset` | Recria o banco com as migrations e o seed |
| `pnpm db:types` | Regenera `src/types/database.ts` a partir do banco local |

## Estrutura

```
src/
  app/                 rotas (App Router)
    (public)/          login e recuperação de senha
    (app)/             área autenticada: layout com sidebar, loading e error
    auth/              confirmação de e-mail (token_hash) e saída
  components/          UI reutilizável (ui/, layout/, charts/)
  features/            regras e dados por módulo: consultas, server actions, schemas e componentes
  hooks/  lib/  types/
  proxy.ts             renovação de sessão e redirecionamento otimista
supabase/
  migrations/          schema, RLS, funções e views
  seed.sql             dados fictícios
  templates/           e-mails de recuperação e convite
```

## Rotas e papéis

| Rota | Gestor | Coordenador | Estudante |
|---|---|---|---|
| `/gestao` (visão geral) e `/gestao/relatorio` (CSV) | sim | não | não |
| `/inteligencia` (modelo, fatores, segmentos e insights com IA) | sim | não | não |
| `/alunos` (carteira priorizada e ficha) | todos os cursos | cursos que coordena | não |
| `/acoes` (ações e pedidos de apoio) | todos os cursos | cursos que coordena | não |
| `/desligamentos` (pedidos, registro manual, análises) e `/desligamentos/[id]` | sim, com análises | cursos que coordena, sem análises | não |
| `/situacao-academica` (matrícula, pedidos, apoio) e o questionário de desligamento | não | não | somente os próprios |
| `/minha-jornada` (indicadores, competências, currículo com IA) | não | não | somente a própria |
| `/carreira` (trilha, vagas e candidatura, áreas, empresas) | não | não | somente a própria |
| `/curriculo` (perfil profissional, competências, editor, PDF, scanner ATS) | não | não | somente o próprio |
| `/empregabilidade` (indicadores agregados de carreira) | sim | não | não |
| `/privacidade` (pedidos de titular, LGPD) | sim | não | não |
| `/meus-dados` (exportar, excluir dados de carreira, pedidos de privacidade) | não | não | somente os próprios |

## Segurança e LGPD

- **A autorização acontece no banco.** Todas as tabelas têm RLS e nenhuma policy para `anon`. A instituição é a fronteira de acesso. FKs compostas `(id, instituicao_id)` impedem vínculos entre instituições.
- **Escopo por papel:** coordenador vê apenas os cursos que coordena. O estudante vê apenas os próprios dados e **não tem acesso ao score de risco** nem às ações internas.
- **Pseudonimização:** a equipe identifica alunos por código, nunca pelo nome. Nomes de alunos não ficam visíveis para a equipe. CPF, telefone e endereço não são armazenados.
- **Pesquisa de desligamento:** a resposta só existe com consentimento. Respostas individuais não são legíveis por nenhum papel; a gestão vê apenas agregados, e só a partir de 5 respostas.
- **Auditoria:** a abertura da ficha (`abrir_ficha`) e as alterações em ações, pedidos e solicitações são registradas em `audit_log`, apenas com ids e nomes de campos, sem conteúdo.
- **Autenticação:** sem cadastro público (contas provisionadas pela instituição). Senha com no mínimo 8 caracteres, letras e números. A recuperação de senha dá a mesma resposta exista ou não a conta, e o link vale para um único uso.
- **Formulários:** validação com Zod no cliente e de novo nas Server Actions. Os formulários funcionam sem JavaScript, como POST, e não colocam dados pessoais na URL. Os logs registram apenas códigos de erro.

## Decisões técnicas

- **`cacheComponents` desativado.** Todas as telas dependem da sessão e de dados por usuário, então não há shell estático a aproveitar, e cachear dados sensíveis aumentaria o risco.
- **Score de risco.** É produzido por um modelo externo e gravado em `avaliacoes_risco` (probabilidade, faixa, fatores, versão do modelo). A aplicação só exibe esses dados; nenhum modelo é simulado no app.
- **Evasão.** Calculada como trancamento + cancelamento + abandono ao fim de cada semestre encerrado (`vinculos_periodo`).

## Questionário de desligamento

- **Abertura:** quando um pedido de trancamento ou cancelamento é aberto, pela integração ou por registro manual da equipe, o aluno recebe um questionário opcional. Ele tem 5 etapas (motivos, contexto, apoio, comentários e revisão), perguntas condicionais e salvamento automático. O catálogo de perguntas é versionado em `src/features/desligamento/questionario.ts`.
- **Recusa:** responder é opcional. "Prefiro não responder" descarta o que foi salvo e não afeta o pedido.
- **Risco no momento do pedido:** fica gravado (`faixa_no_pedido`) e nunca é reescrito por avaliações posteriores.
- **Leitura individual:** só com a permissão `perfis.ve_respostas_desligamento`, e cada leitura é auditada. **Saúde** exige consentimento específico e nunca é exibida individualmente. Nos agregados, só aparece com 5 ocorrências ou mais.
- **Recortes pequenos:** recortes com menos de 5 respondentes são suprimidos.
- **Papel `apoio`:** equipe de apoio ao estudante, com visão da instituição inteira. Os serviços de apoio oferecidos no questionário vêm de `servicos_apoio`, para nunca prometer algo que a instituição não oferece.

## Currículo e scanner ATS

- **Perfil profissional em 7 etapas** (`/curriculo/perfil`): objetivo, contato, formação verificada, experiências (inclusive informais), vivências e projetos, competências, idiomas e certificações. As vivências usam perguntas que revelam competências ocultas: coordenação de grupo, organização de eventos, ajuda técnica, voluntariado e gestão de recursos.
- **Competências com evidência** (`/curriculo/competencias`): a IA sugere a competência e o trecho literal que a justifica. Uma sugestão cujo trecho não está no texto do aluno é descartada no servidor. Nada vira confirmado sem a aprovação do aluno, e o banco força `status = 'sugerida'` em toda competência de origem IA.
- **Currículo** (`/curriculo/editor`): é montado só com dados confirmados, e a IA escreve apenas o resumo e os tópicos (sem IA, usa os textos do próprio aluno). O aluno edita, reordena seções e remove itens. O PDF é gerado no servidor (`@react-pdf/renderer`), em coluna única, sem cabeçalho ou rodapé, com títulos de seção padronizados e dois modelos.
- **Versões em PDF:** cada versão fica no bucket privado `curriculos` do Storage, com download por URL assinada de 60 segundos.
- **Scanner ATS** (`/curriculo/ats`), com dois indicadores separados. São estimativas do KairusEdu, sem garantia de aprovação.
  - **Leitura por ATS:** determinística, sem IA. Verifica texto extraível, marcas de impressão do navegador, contato, seções padrão, datas, tópicos, tamanho e ícones. Aceita PDFs gerados aqui e uploads do aluno (PDF ou DOCX, até 4 MB, verificados pela assinatura do arquivo).
  - **Aderência à vaga:** vaga do KairusEdu ou descrição colada. Um requisito só conta como atendido se citar uma evidência real do perfil. Requisitos ausentes nunca são acrescentados ao currículo.
- **Privacidade:** perfil, contato, currículos, uploads e análises são legíveis apenas pelo próprio aluno (RLS e Storage). A instituição não tem acesso individual.

## Empregabilidade e LGPD

- **Painel de empregabilidade** (`/empregabilidade`, gestão e equipe de apoio): perfis criados e completos, currículos gerados, competências confirmadas mais comuns, interesses de carreira, lacunas mais frequentes nas vagas analisadas e participação por curso. Usa só agregados (`painel_empregabilidade`), e grupos com menos de 5 alunos são omitidos. Nenhum currículo, contato ou análise individual chega à instituição.
- **Meus dados** (`/meus-dados`, estudante):
  - finalidades explicadas separadamente (permanência × carreira × IA);
  - exportação em JSON de tudo o que pertence ao aluno;
  - exclusão dos dados de carreira (perfil, currículos, arquivos e análises), confirmada digitando "EXCLUIR" e registrada na auditoria;
  - pedidos de acesso, correção e exclusão.
- **Pedidos de privacidade** (`/privacidade`, gestão): resposta aos pedidos do titular. O aluno é identificado pelo código de matrícula, e cada alteração fica na auditoria.
- **Pendente de definição pela instituição:** bases legais por finalidade e prazos de guarda dos dados. O portal informa que são definidos pela instituição.

## Funções de IA

Chamadas pelo SDK oficial da Anthropic (`@anthropic-ai/sdk`) no endpoint do OpenRouter compatível com a API Messages, com saída estruturada (JSON Schema) e validação com Zod. Código em `src/lib/ai/cliente.ts` (cliente, limites e registro de uso), `src/features/curriculo/` (prompts e ações do currículo) e `src/features/ia/` (insights da gestão).

| Função | Quem usa | O que envia ao modelo | Limite diário |
|---|---|---|---|
| Competências com evidência | Estudante | Curso e textos das experiências e projetos | 10 |
| Resumo e tópicos do currículo | Estudante | Objetivo, competências confirmadas, textos dos itens e requisitos da vaga-alvo | 15 |
| Requisitos e aderência à vaga | Estudante | Texto da vaga e evidências do perfil (sem nome nem contato) | 15 |
| Insights de permanência | Gestão | Apenas indicadores agregados | 5 |

- **Nunca são enviados:** nome, matrícula, e-mail, telefone ou endereço. Cada chamada registra modelo, tokens e custo em `ia_uso`, sem o conteúdo.
- **Prompt injection:** o texto do aluno vai delimitado e é tratado como conteúdo. A saída só é aceita se passar no schema e nas validações do servidor.
- **Sem invenção:** os prompts proíbem criar empresas, números, ferramentas ou qualificações. Evidências e ids citados pela IA são conferidos no servidor.

## Próximas fases

- Identifiquei que essas áreas poderiam possuir, no futuro:
  - vídeos de preparação para entrevista (o protótipo mostra, mas não há conteúdo real);
  - acompanhamento das candidaturas pela coordenação;
  - gestão de usuários, cursos e vagas pela própria instituição (hoje o provisionamento é feito pelo banco);
  - relatórios configuráveis e a consulta da trilha de auditoria na interface.
- O score de risco continua vindo de um modelo externo gravado em `avaliacoes_risco`; o treino com dados reais é parte do piloto.
