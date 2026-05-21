import { Module, forwardRef } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { GetMembershipService } from './get-membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => AuditLogsModule),
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    GetMembershipService,
    PrismaService,
  ],
  exports: [GetMembershipService],
})
export class OrganizationModule {}
