import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkGuard } from '../../../common/guards/clerk.guard';
import { MembershipGuard } from '../../../common/guards/membership.guard';
import { SaaSControlService, TenantSaaSSnapshot } from './saas-control.service';
import { CurrentOrg } from '../../../common/decorators/org.decorator';
import { CurrentUser } from '../../../common/decorators/user.decorator';

@ApiTags('Core SaaS Control')
@Controller('core/saas-control')
@UseGuards(ClerkGuard, MembershipGuard)
export class SaaSControlController {
  constructor(private readonly saasControl: SaaSControlService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get current tenant SaaS configuration and licensed modules' })
  async getConfig(
    @CurrentOrg() org: any,
    @CurrentUser() user: any
  ): Promise<TenantSaaSSnapshot> {
    return this.saasControl.getTenantSnapshot(org.id, user.id);
  }
}
