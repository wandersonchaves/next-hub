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
  WorkflowStep,
  Unit,
  UserOrganizationUnit,
  UserInvitation,
  LeadPipeline
} from './generated/client/index.js'
import { PrismaClient } from './generated/client/index.js'
import { AsyncLocalStorage } from 'node:async_hooks'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

export const tenantContext = new AsyncLocalStorage<{ organizationId: string; unitId?: string }>()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl && process.env.NODE_ENV !== 'test') {
  console.warn('WARNING: DATABASE_URL is not defined. Database connection will fail.')
}

const pool = new pg.Pool(databaseUrl ? { connectionString: databaseUrl } : {})
const adapter = new PrismaPg(pool)

export async function disconnect() {
  await prisma.$disconnect()
  await pool.end()
}

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

        // Models that are unit-specific (in addition to being organization-specific)
        const unitModels = [
          'Lead', 
          'Appointment', 
          'SuggestedMessage', 
          'Interaction', 
          'Procedure', 
          'Pet', 
          'PetService',
          'LeadPipeline'
        ]

        // If we have an organizationId in context, inject it into the query
        if (context?.organizationId) {
          const anyArgs = args as any
          const whereExtension: any = { organizationId: context.organizationId }

          if (context.unitId && unitModels.includes(model)) {
            // Note: LeadPipeline is linked to Lead, which is linked to Unit.
            // But LeadPipeline table itself doesn't have unitId in schema (I didn't add it).
          }

          if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany', 'findUnique'].includes(operation)) {
            if (operation !== 'findUnique') {
              anyArgs.where = { ...anyArgs.where, ...whereExtension }
            }
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
