import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './core/health/health.controller';
import { OrganizationModule } from './core/organization/organization.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { BillingModule } from './core/billing/billing.module';

import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from './core/notifications/notifications.module';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ProspectorModule } from './modules/prospector/prospector.module';
import { NexusHealthModule } from './modules/nexus-health/nexus-health.module';

import { AnalyticsModule } from './core/analytics/analytics.module';
import { AuditLogsModule } from './core/audit-logs/audit-logs.module';

import { TasksModule } from './core/tasks/tasks.module';

import { WebhooksModule } from './common/webhooks/webhooks.module';

import { BackupModule } from './core/backup/backup.module';

import { PluginsModule } from './core/plugins/plugins.module';

import { MarketplaceModule } from './core/marketplace/marketplace.module';

import { validateEnv } from './common/config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { ClerkGuard } from './common/guards/clerk.guard';
import { MembershipGuard } from './common/guards/membership.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { BranchIsolationGuard } from './common/guards/branch-isolation.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    OrganizationModule,
    BillingModule,
    NotificationsModule,
    AuditLogsModule,
    ProspectorModule,
    NexusHealthModule,
    AnalyticsModule,
    TasksModule,
    WebhooksModule,
    BackupModule,
    PluginsModule,
    MarketplaceModule,
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
    BranchIsolationGuard,
    PermissionsGuard,
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

