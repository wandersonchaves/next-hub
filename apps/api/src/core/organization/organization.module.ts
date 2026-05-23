import { Module, forwardRef, Global } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { GetMembershipService } from './get-membership.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Global()
@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => AuditLogsModule),
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    GetMembershipService,
  ],
  exports: [GetMembershipService, OrganizationService],
})
export class OrganizationModule { }
