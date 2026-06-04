import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { MultiLevelAuthGuard } from '../../../common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../../../common/guards/membership.guard';
import { CurrentOrg } from '../../../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';

@Controller('audit-logs')
@UseGuards(MultiLevelAuthGuard, MembershipGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async getLogs(@CurrentOrg() org: Organization) {
    if (!org) {
      return []; // Ou lançar exceção se orgSlug for obrigatório
    }
    return this.auditLogsService.getLogs(org.id);
  }
}
