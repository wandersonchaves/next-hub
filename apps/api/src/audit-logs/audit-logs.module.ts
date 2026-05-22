import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsProcessor } from './audit-logs.processor';
import { AuditLogsController } from './audit-logs.controller';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audit-logs',
    }),
    forwardRef(() => OrganizationModule),
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogsProcessor],
  exports: [AuditLogsService],
})
export class AuditLogsModule { }
