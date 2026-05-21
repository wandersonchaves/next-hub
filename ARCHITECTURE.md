# Enterprise SaaS: Clean Architecture & Performance Manifesto

Este documento define as diretrizes arquiteturais para garantir que o sistema seja sustentável (Clean) e extremamente rápido (High Performance).

## 1. Princípios de Clean Architecture
O objetivo é a **Independência de Framework**. A lógica de negócio deve residir em camadas concêntricas:

1.  **Domain (Core):** Entidades puras e validações com Zod. Sem dependências externas.
2.  **Application (Use Cases):** Orquestração de ações (Ex: `CreateOrganization`). Aqui aplicamos o **CQRS**.
3.  **Infrastructure:** Adaptadores para Prisma, Stripe, Gemini, etc.
4.  **Presentation:** Controllers (NestJS) e Server Components (Next.js).

## 2. Estratégias de Alta Performance

### A. Otimização de I/O (Banco de Dados)
*   **Selective Selection:** Nunca busque o objeto completo (`*`). Use `select` no Prisma para trazer apenas as colunas necessárias para o DTO.
*   **Connection Pooling:** Use `PgBouncer` para evitar o custo de abertura de conexões TCP.
*   **Índices Compostos:** Toda query de tenant deve usar índices que incluam `organizationId`.

### B. Autorização de Latência Zero (Stateless RBAC)
*   **JWT Claims:** Armazene a `role` e o `activeOrganizationId` dentro do payload do JWT.
*   **Vantagem:** O Backend autoriza requisições verificando apenas a assinatura do token (CPU), eliminando milhares de consultas ao banco de dados por segundo.

### C. Frontend: Server-First & Streaming
*   **React Server Components (RSC):** Busque dados no servidor para reduzir o JavaScript no cliente.
*   **Streaming/Suspense:** Não bloqueie a página. Mostre Skeletons enquanto os dados pesados são carregados via Stream.

### D. Processamento Assíncrono (Background Jobs)
*   **Fila BullMQ:** Tarefas que não impactam o usuário imediato (Audit Logs, E-mails, Webhooks) devem ser movidas para filas Redis. Isso libera o Event Loop da API para processar mais requisições.

## 3. Guia de Implementação (Padrões de Código)

### Validação Compartilhada
Mantenha Schemas Zod em `packages/common`. Use-os tanto no `react-hook-form` (Web) quanto no `ValidationPipe` (API).

### RBAC Granular
Use o componente `<Can />` no frontend e o decorator `@Roles()` no backend para garantir que as permissões sejam verificadas em todas as camadas.
