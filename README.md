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

Os e-mails locais (recuperação de senha) aparecem no Mailpit, em http://127.0.0.1:54324.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL da API do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável. É pública por definição; o acesso é controlado por RLS |
| `NEXT_PUBLIC_SITE_URL` | URL pública da aplicação |

A aplicação não usa a chave secreta (service role). Nenhum segredo vai para o frontend.

## Scripts

| Script | O que faz |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Desenvolvimento, build e produção |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript |
| `pnpm db:start` / `pnpm db:stop` | Sobe ou para o Supabase local |
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
| `/alunos` (carteira priorizada e ficha) | todos os cursos | cursos que coordena | não |
| `/acoes` (ações e pedidos de apoio) | todos os cursos | cursos que coordena | não |
| `/desligamentos` | sim, com motivos agregados | cursos que coordena | não |
| `/minha-jornada` | não | não | somente a própria |

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

## Próximas fases (fora desta entrega)

- **Fase 2.** Inteligência de Permanência (métricas do modelo, fatores, segmentos) e Carreira e estágio (vagas, candidaturas, trilhas, empresas).
- **Fase 3.** Recursos de IA generativa (currículo, competências a partir de vivências). Exigem integração com LLM no servidor.
- Identifiquei que essas áreas poderiam possuir, no futuro: gestão de usuários e cursos pela própria instituição (hoje o provisionamento é feito pelo banco), relatórios configuráveis e a consulta da trilha de auditoria na interface.
# hairus-edu
