export * from './generated/client/index.js'
export type {
  Organization,
  User,
  Member,
  Subscription,
  Document,
  Invite,
  Webhook,
  ApiKey,
  AuditLog,
  Plugin,
  MarketplaceExtension,
  InstalledExtension,
  Workflow,
  WorkflowStep
} from './generated/client/index.js'
import { PrismaClient } from './generated/client/index.js'
import { AsyncLocalStorage } from 'node:async_hooks'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

export const tenantContext = new AsyncLocalStorage<{ organizationId: string; branchId?: string }>()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
  adapter,
}).$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const context = tenantContext.getStore()

        // Models that are NOT tenant-specific (global models)
        const globalModels = ['User', 'Account', 'Organization', 'MarketplaceExtension']

        if (globalModels.includes(model)) {
          return query(args)
        }

        // Models that are branch-specific (in addition to being organization-specific)
        const branchModels = ['Lead', 'Appointment']

        // If we have an organizationId in context, inject it into the query
        if (context?.organizationId) {
          const anyArgs = args as any
          const whereExtension: any = { organizationId: context.organizationId }

          if (context.branchId && branchModels.includes(model)) {
            whereExtension.branchId = context.branchId
          }

          if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
            anyArgs.where = { ...anyArgs.where, ...whereExtension }
          } else if (['create', 'createMany'].includes(operation)) {
            if (Array.isArray(anyArgs.data)) {
              anyArgs.data = anyArgs.data.map((item: any) => ({
                ...item,
                ...whereExtension,
              }))
            } else {
              anyArgs.data = { ...anyArgs.data, ...whereExtension }
            }
          }
        }

        return query(args)
      },
    },
  },
})

export type ExtendedPrismaClient = typeof prisma
export { PrismaClient }
