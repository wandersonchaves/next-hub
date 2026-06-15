import { Module, OnModuleDestroy, Inject, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import basicAuth from 'express-basic-auth';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './modules/nexthub/health/health.controller';
import { OrganizationModule } from './modules/nexthub/organization/organization.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { getRedisConfig } from './common/config/redis.config';

import { BillingModule } from './modules/nexthub/billing/billing.module';

import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from './modules/nexthub/notifications/notifications.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

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
import { AuthModule } from './modules/nexthub/auth/auth.module';
import { MembershipGuard } from './common/guards/membership.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UnitIsolationGuard } from './common/guards/unit-isolation.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ModuleAccessGuard } from './common/guards/module-access.guard';
import { MultiLevelAuthGuard } from './common/guards/multi-level-auth.guard';
import { DataArchiverWorker } from './common/workers/data-archiver.worker';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
      middleware: basicAuth({
        users: { admin: process.env.ADMIN_PASS || 'admin' },
        challenge: true,
      }),
    }),
    AuthModule,
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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (process.env.NODE_ENV === 'test') {
          return {
            throttlers: [{
              ttl: 60000,
              limit: 100,
            }],
          };
        }
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return {
          throttlers: [{
            ttl: 60000,
            limit: 100,
          }],
          storage: new ThrottlerStorageRedisService(redisUrl),
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        if (process.env.NODE_ENV === 'test') {
          const MockRedis = require('ioredis-mock');
          return {
            connection: new MockRedis(),
            defaultJobOptions: {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            },
          };
        }
        const redisConfig = getRedisConfig();

        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            ...(redisConfig.password ? { password: redisConfig.password } : {}),
            // Required by BullMQ when using ioredis
            maxRetriesPerRequest: null,
            retryStrategy: (times) => {
              // Reconnect after a delay
              const delay = Math.min(times * 200, 5000);
              return delay;
            },
          },
          defaultJobOptions: {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'data-archiver' },
    ),
    BullBoardModule.forFeature({
      name: 'data-archiver',
      adapter: BullMQAdapter,
    }),
    PrometheusModule.register(),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        if (process.env.NODE_ENV === 'test') {
          return {
            ttl: 600,
          };
        }
        const redisConfig = getRedisConfig();
        
        return {
          store: await redisStore({
            socket: {
              host: redisConfig.host,
              port: redisConfig.port,
            },
            password: redisConfig.password,
            ttl: 600,
          }),
        };
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    MembershipGuard,
    RolesGuard,
    UnitIsolationGuard,
    PermissionsGuard,
    ModuleAccessGuard,
    MultiLevelAuthGuard,
  ],
})
export class AppModule implements OnModuleDestroy, NestModule {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  configure(consumer: MiddlewareConsumer) {
    // consumer.apply(basicAuth({ users: { admin: process.env.ADMIN_PASS || "admin" }, challenge: true })).forRoutes("/admin/queues*");
    consumer
      .apply(
        basicAuth({
          users: { admin: process.env.ADMIN_PASS || 'admin' },
          challenge: true,
        }),
      )
      .forRoutes('/admin/queues*path');
  }

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
