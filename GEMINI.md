# 🚀 Enterprise SaaS Starter Kit - Gemini Context

This document serves as the foundational instructional context for Gemini CLI interactions with this repository. It outlines the project's purpose, architecture, development workflows, and engineering standards.

## 📖 Project Overview

The **Enterprise SaaS Starter Kit** is a high-performance, agnostic foundation for B2B SaaS applications. It is built with a focus on **Clean Architecture**, **Scalability**, and a superior **Developer Experience (DX)**.

### Core Tech Stack
- **Monorepo:** Managed by `pnpm` workspaces and `Turborepo`.
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Clerk (Authentication & Multi-tenancy).
- **Backend:** NestJS, BullMQ (Background Processing), Redis (Caching & Queues), Svix (Webhooks).
- **Data:** PostgreSQL with Prisma ORM, utilizing native multi-tenancy isolation.
- **Payments:** Stripe integration for subscriptions and checkouts.

## 🏗 Architectural Principles

As defined in `ARCHITECTURE.md`, the project adheres to strict **Clean Architecture** boundaries to ensure framework independence and maintainability:

1.  **Domain (Core):** Pure business logic, entities, and Zod schemas. No external dependencies.
2.  **Application (Use Cases):** Orchestration of business actions (e.g., `CreateOrganization`) using the **CQRS** pattern.
3.  **Infrastructure:** Implementation of external adapters (Prisma, Stripe, AWS S3, Gemini, etc.).
4.  **Presentation:** API Controllers (NestJS) and React Server Components (Next.js).

### Performance Strategies
- **Selective Prisma Queries:** Always use `select` to fetch only necessary DTO columns.
- **Stateless RBAC:** User roles and active organization IDs are embedded in JWT claims to minimize database hits.
- **Server-First Frontend:** Heavy use of React Server Components (RSC) and Streaming/Suspense for perceived speed.
- **Asynchronous Offloading:** Non-critical tasks (Audit Logs, Emails, Webhooks) are processed out-of-band via **BullMQ**.

## 🛠 Building and Running

### Development Workflow
Ensure Docker is running for PostgreSQL and Redis.

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm db:generate

# Start development environment (Turbo)
pnpm dev
```

### Production Build
```bash
# Build all apps and packages
pnpm build

# Deploy migrations
pnpm --filter @enterprise/database prisma migrate deploy
```

## 📜 Development Conventions

### Coding Style & Standards
- **Language:** TypeScript for all packages.
- **Validation:** Shared Zod schemas in `packages/common` used by both frontend and backend.
- **Multi-tenancy:** Every tenant-specific query MUST include `organizationId` filtering, backed by compound indexes.
- **RBAC:** Use the `<Can />` component in the Web app and `@Roles()` decorator in the API.

### Project Structure
- `apps/web`: Next.js frontend, focusing on UX/UI and Server Components.
- `apps/api`: NestJS backend, following Clean Architecture layers.
- `apps/gateway`: (Placeholder/Future) API Gateway.
- `packages/database`: Centralized Prisma schema, migrations, and seed scripts.
- `packages/common`: Shared types, Zod schemas, and utility functions.
- `packages/events`: Shared event definitions and BullMQ configuration.

## 🧪 Testing
- **Backend:** Uses Jest for unit and E2E tests. Run via `pnpm --filter api test` or `pnpm --filter api test:e2e`.
- **Naming:** Tests follow the `*.spec.ts` or `*.e2e-spec.ts` convention.

---
*Refer to `ARCHITECTURE.md` for deep-dives into specific engineering patterns.*
