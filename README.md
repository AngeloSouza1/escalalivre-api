# EscalaLivre API

Backend do MVP do EscalaLivre, plataforma para conectar comércios com necessidade imediata de mão de obra a profissionais disponíveis para trabalhar por turno, diária ou bico.

## Stack

- Node.js + Fastify
- PostgreSQL
- Prisma ORM
- JWT para autenticação
- Deploy com Render ou Railway

## Módulos do MVP

- `auth`: cadastro, login e sessão
- `users`: perfil do profissional e do comércio
- `jobs`: criação e gestão de vagas
- `applications`: candidatura e aprovação
- `reviews`: avaliações após conclusão

## Requisitos

- Node.js 20+
- PostgreSQL 14+

## Variáveis de ambiente

Use [.env.example](/home/angelo/Downloads/projeto-jean/escalalivre-api/.env.example) como base:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/escalalivre"
JWT_SECRET="troque-por-uma-chave-forte"
JWT_EXPIRES_IN="7d"
```

## Setup local

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Se estiver criando o banco local do zero, também pode usar:

```bash
npx prisma migrate dev
```

## Seed de desenvolvimento

O projeto inclui um seed idempotente em [prisma/seed.js](/home/angelo/Downloads/projeto-jean/escalalivre-api/prisma/seed.js).

Executar:

```bash
npm run seed
```

O seed:

- cria 2 comércios e 3 profissionais
- recria vagas de demonstração
- cria candidaturas `PENDING` e `APPROVED`
- cria um job `COMPLETED` com avaliações

Credenciais padrão:

- `bar.centro@escalalivre.dev / 123456`
- `padaria.vila@escalalivre.dev / 123456`
- `maria@escalalivre.dev / 123456`
- `joao@escalalivre.dev / 123456`
- `ana@escalalivre.dev / 123456`

## Testes de integração

A suíte cobre os fluxos críticos do MVP:

- login
- criação de vaga
- candidatura duplicada
- aprovação de candidatura
- review após conclusão do job

Executar:

```bash
npm run test:integration
```

Requisitos:

- PostgreSQL acessível pela `DATABASE_URL`
- migrations já aplicadas

## Deploy no Render

O projeto já inclui [render.yaml](/home/angelo/Downloads/projeto-jean/escalalivre-api/render.yaml).

Fluxo:

1. Suba o projeto para um repositório Git.
2. No Render, escolha `New +` -> `Blueprint`.
3. Conecte o repositório.
4. O Render criará:
   - um `Web Service` da API
   - um PostgreSQL gerenciado
5. Após o deploy, teste:

```bash
curl https://SEU-SERVICO.onrender.com/health
```

## Endpoints principais

### Health

```http
GET /health
```

### Auth

```http
POST /auth/register
POST /auth/login
GET /auth/me
```

### Users

```http
GET /users/me
PATCH /users/me
```

### Jobs

```http
POST /jobs
GET /jobs
GET /jobs/mine
GET /jobs/:id
PATCH /jobs/:id/status
GET /jobs/:id/applications
```

### Applications

```http
POST /jobs/:jobId/applications
GET /applications/mine
PATCH /applications/:id/status
```

### Reviews

```http
POST /jobs/:jobId/reviews
GET /reviews/me
```

## Fluxo mínimo de teste

### 1. Cadastrar um comércio

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "BUSINESS",
    "name": "Bar do Centro",
    "email": "bar@example.com",
    "password": "123456",
    "city": "Sao Jose dos Campos",
    "businessName": "Bar do Centro",
    "category": "bar"
  }'
```

### 2. Cadastrar um profissional

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "WORKER",
    "name": "Maria",
    "email": "maria@example.com",
    "password": "123456",
    "city": "Sao Jose dos Campos",
    "functions": ["garcom", "atendente"]
  }'
```

### 3. Criar uma vaga

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Authorization: Bearer TOKEN_DO_BUSINESS" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Garcom para sexta a noite",
    "description": "Atendimento no salao",
    "category": "garcom",
    "city": "Sao Jose dos Campos",
    "paymentAmount": 150,
    "startAt": "2026-03-13T18:00:00.000Z",
    "endAt": "2026-03-13T23:00:00.000Z",
    "slots": 2
  }'
```

### 4. Candidatar-se

```bash
curl -X POST http://localhost:3000/jobs/JOB_ID/applications \
  -H "Authorization: Bearer TOKEN_DO_WORKER" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tenho experiencia em bares e eventos"
  }'
```

### 5. Aprovar candidatura

```bash
curl -X PATCH http://localhost:3000/applications/APPLICATION_ID/status \
  -H "Authorization: Bearer TOKEN_DO_BUSINESS" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED"
  }'
```

## Colecao Postman

Arquivos:

- [EscalaLivre.postman_collection.json](/home/angelo/Downloads/projeto-jean/escalalivre-api/docs/postman/EscalaLivre.postman_collection.json)
- [EscalaLivre.local.postman_environment.json](/home/angelo/Downloads/projeto-jean/escalalivre-api/docs/postman/EscalaLivre.local.postman_environment.json)

Uso:

1. Importe a collection e o environment no Postman ou Insomnia.
2. Se necessario, atualize `openJobId` e `pendingApplicationId` com os IDs do seed atual.
3. Rode primeiro:
   - `Health`
   - `Login BUSINESS`
   - `Login WORKER`
4. Depois execute os requests de `Jobs` e `Applications`.

Os requests de login salvam automaticamente `businessToken` e `workerToken` nas variaveis da collection.

## Deploy no Fly.io

O projeto inclui uma configuracao inicial em [fly.toml](/home/angelo/Downloads/projeto-jean/escalalivre-api/fly.toml).

Antes do primeiro deploy:

1. Ajuste o valor de `app` no `fly.toml` se o nome global estiver em uso.
2. Instale e autentique o CLI do Fly:

```bash
fly auth login
```

3. Crie o app sem deploy inicial:

```bash
fly launch --no-deploy
```

4. Crie um Postgres no Fly ou use um banco externo.
5. Configure os secrets:

```bash
fly secrets set JWT_SECRET="troque-por-uma-chave-forte" JWT_EXPIRES_IN="7d"
```

6. Associe o banco ao app:

Postgres tradicional no Fly:

```bash
fly postgres attach <nome-do-postgres> --app <nome-do-app>
```

Managed Postgres:

```bash
fly mpg attach <cluster-id> --app <nome-do-app>
```

7. Faça o deploy:

```bash
fly deploy
```

8. Teste:

```bash
curl https://<nome-do-app>.fly.dev/health
```

## Modelo de dados

Entidades principais:

- `User`
- `WorkerProfile`
- `BusinessProfile`
- `Job`
- `Application`
- `Review`

Schema Prisma em [prisma/schema.prisma](/home/angelo/Downloads/projeto-jean/escalalivre-api/prisma/schema.prisma).

## Próximas evoluções recomendadas

- validação de payload com schema
- testes automatizados de integração
- seed de desenvolvimento
- paginação e filtros mais completos
- notificações
- reputação agregada por worker/comércio
- painel administrativo
# escalalivre-api
