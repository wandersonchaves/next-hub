# 🚀 Enterprise SaaS Starter Kit

A base definitiva, agnóstica e de alto desempenho para o seu próximo software SaaS B2B. Construído com foco em **Clean Architecture**, **Escalabilidade** e **Experiência do Desenvolvedor**.

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Clerk (Auth & Multi-tenancy), Sonner (Notifications), Lucide Icons.
- **Backend:** NestJS, BullMQ (Background Jobs), Redis (Caching), Prometheus (Monitoring), Svix (Webhooks).
- **Database:** PostgreSQL + Prisma (com suporte a multi-tenancy nativo).
- **Pagamentos:** Stripe (Checkout Session & Webhooks).

## ✨ Funcionalidades Core

- [x] **Multi-tenancy Nativo:** Isolamento de dados por organização via Prisma e Clerk.
- [x] **Enterprise Auth:** Login Social, E-mail/Senha e Gestão de Organização via Clerk.
- [x] **Audit Logs:** Trilha de auditoria completa SOC2 Ready.
- [x] **Billing & Subscriptions:** Fluxo completo de assinatura com Stripe.
- [x] **Clean Architecture:** Backend desacoplado e fácil de testar.
- [x] **White-label Ready:** Estrutura preparada para cores e logos dinâmicos.
- [x] **Dark Mode:** Suporte completo a temas com persistência.

## 🚀 Como Começar

### 1. Requisitos
- Node.js 20+ & pnpm
- Docker (para PostgreSQL e Redis)

### 2. Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz e nos pacotes `apps/web` e `apps/api`:

#### apps/web/.env.local
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### apps/api/.env
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
REDIS_HOST="localhost"
REDIS_PORT=6379
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Instalação e Execução
```bash
pnpm install
pnpm db:generate
pnpm dev
```

## 🚀 Produção

Para preparar a aplicação para produção, utilize os comandos abaixo:

### 1. Build de todos os pacotes
```bash
pnpm build
```

### 2. Migrations de Banco de Dados
Certifique-se de rodar as migrations antes de iniciar o servidor de API:
```bash
pnpm --filter @enterprise/database prisma migrate deploy
```

### 3. Check-list de Deploy
- **Frontend (Vercel/Netlify):** Aponte para a pasta `apps/web`. Configure as variáveis `NEXT_PUBLIC_` no painel.
- **Backend (Railway/Render/AWS):** Aponte para a pasta `apps/api`. Certifique-se de que o Redis e o PostgreSQL estejam acessíveis.
- **Webhooks:** Cadastre as URLs de produção no painel do Clerk e do Stripe.

## 📂 Estrutura do Projeto

- `apps/web`: Frontend Next.js com foco em UX/UI.
- `apps/api`: Backend NestJS seguindo Clean Architecture.
- `packages/database`: Schema central do Prisma e migrations.
- `packages/common`: Tipos e utilitários compartilhados.

## 📄 Licença
Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---
Desenvolvido para acelerar o seu tempo de mercado (Time-to-Market). 🚀
