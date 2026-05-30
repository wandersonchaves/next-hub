import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './modules/nexthub/health/health.controller';
import { OrganizationModule } from './modules/nexthub/organization/organization.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { BillingModule } from './modules/nexthub/billing/billing.module';

import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from './modules/nexthub/notifications/notifications.module';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ProspectorModule } from './modules/prospector/prospector.module';
import { HealthModule } from './modules/health/health.module';
import { PetModule } from './modules/pet/pet.module';

import { AnalyticsModule } from './modules/nexthub/analytics/analytics.module';
import { AuditLogsModule } from './modules/nexthub/audit-logs/audit-logs.module';

import { TasksModule } from './modules/nexthub/tasks/tasks.module';

import { WebhooksModule } from './common/webhooks/webhooks.module';

import { BackupModule } from './modules/nexthub/backup/backup.module';

import { PluginsModule } from './modules/nexthub/plugins/plugins.module';

import { validateEnv } from './common/config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { TenantContextModule } from './common/utils/tenant-context/tenant-context.module';
import { EnginesModule } from './common/engines/engines.module';
import { SaaSControlModule } from './modules/nexthub/saas-control/saas-control.module';
import { ClerkGuard } from './common/guards/clerk.guard';
import { MembershipGuard } from './common/guards/membership.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UnitIsolationGuard } from './common/guards/unit-isolation.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ModuleAccessGuard } from './common/guards/module-access.guard';
import { MultiLevelAuthGuard } from './common/guards/multi-level-auth.guard';
import { DataArchiverWorker } from './common/workers/data-archiver.worker';

@Module({
  imports: [
    PrismaModule,
    TenantContextModule,
    EnginesModule,
    SaaSControlModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    OrganizationModule,
    BillingModule,
    NotificationsModule,
    AuditLogsModule,
    ProspectorModule,
    HealthModule,
    PetModule,
    AnalyticsModule,
    TasksModule,
    WebhooksModule,
    BackupModule,
    PluginsModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'data-archiver' },
    ),
    PrometheusModule.register(),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
          ttl: 600,
        }),
      }),
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    ClerkGuard,
    MembershipGuard,
    RolesGuard,
    UnitIsolationGuard,
    PermissionsGuard,
    ModuleAccessGuard,
    MultiLevelAuthGuard,
    DataArchiverWorker,
  ],
})
export class AppModule implements OnModuleDestroy {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  async onModuleDestroy() {
    // cache-manager v7 uses 'stores' instead of 'store'
    const stores = (this.cacheManager as any).stores;
    if (Array.isArray(stores)) {
      for (const store of stores) {
        if (store.client && typeof store.client.disconnect === 'function') {
          await store.client.disconnect();
        }
      }
    }
  }
}
