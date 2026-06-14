import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma, ExtendedPrismaClient, PrismaClient, disconnect, tenantContext } from '@enterprise/database';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TenantContextService } from '../common/utils/tenant-context/tenant-context.service';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private _prisma: ExtendedPrismaClient;
  private _readReplica?: PrismaClient;
  private _pool?: pg.Pool;

  constructor(private readonly tenantContextService: TenantContextService) {
    const extendClient = (client: any) => {
      return client.$extends({
        query: {
          $allModels: {
            async $allOperations({ model, operation, args, query }) {
              const apiContext = tenantContextService.context;
              const dbContext = tenantContext.getStore();
              
              const organizationId = apiContext?.organizationId || dbContext?.organizationId;
              const unitId = apiContext?.unitId || dbContext?.unitId;

              // Global models that should not be isolated by organizationId
              const globalModels = ['User', 'Account', 'Organization', 'MarketplaceExtension', 'Plugin'];
              if (globalModels.includes(model)) {
                return query(args);
              }

              const anyArgs = args as any;

              // Apply organizationId isolation if available
              if (organizationId) {
                const orgFilter = { organizationId };

                if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
                  anyArgs.where = {
                    ...anyArgs.where,
                    ...orgFilter,
                  };
                } else if (['create', 'createMany'].includes(operation)) {
                  if (Array.isArray(anyArgs.data)) {
                    anyArgs.data = anyArgs.data.map((item: any) => ({
                      ...item,
                      ...orgFilter,
                    }));
                  } else {
                    anyArgs.data = {
                      ...anyArgs.data,
                      ...orgFilter,
                    };
                  }
                }
              }

              // Apply unitId isolation if available and model is unit-specific
              const unitModels = [
                'Lead',
                'Appointment',
                'SuggestedMessage',
                'Interaction',
                'Procedure',
                'Pet',
                'PetService',
                'LeadPipeline',
              ];

              if (unitId && unitModels.includes(model)) {
                const unitFilter = { unitId };

                if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
                  anyArgs.where = {
                    ...anyArgs.where,
                    ...unitFilter,
                  };
                } else if (['create', 'createMany'].includes(operation)) {
                  if (Array.isArray(anyArgs.data)) {
                    anyArgs.data = anyArgs.data.map((item: any) => ({
                      ...item,
                      ...unitFilter,
                    }));
                  } else {
                    anyArgs.data = {
                      ...anyArgs.data,
                      ...unitFilter,
                    };
                  }
                }
              }

              return query(args);
            },
          },
        },
      });
    };

    this._prisma = extendClient(prisma) as any;

    // In production, we initialize a separate read-only client for replicas
    if (process.env.DATABASE_URL_READ_REPLICA) {
      this._pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_READ_REPLICA });
      const adapter = new PrismaPg(this._pool);
      const rawReadReplica = new PrismaClient({
        adapter,
      });
      this._readReplica = extendClient(rawReadReplica) as any;
    }
  }

  // Use the primary client (with the multi-tenancy extension)
  get client() {
    return this._prisma;
  }

  // Use the read-only replica when needed
  get readReplica() {
    return this._readReplica || this._prisma;
  }

  async onModuleInit() {
    await this._prisma.$connect();
    if (this._readReplica) {
      await this._readReplica.$connect();
    }
  }

  async onModuleDestroy() {
    await disconnect();
    if (this._readReplica) {
      await this._readReplica.$disconnect();
    }
    if (this._pool) {
      await this._pool.end();
    }
  }
}
