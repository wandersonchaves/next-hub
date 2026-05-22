import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { Role } from '@enterprise/database';
import type { User, Organization } from '@enterprise/database';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { MembershipGuard } from '../../common/guards/membership.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { CurrentOrg } from '../../common/decorators/org.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('organizations')
@UseGuards(ClerkGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  async createOrganization(
    @CurrentUser() user: User,
    @Body('name') name: string,
    @Body('slug') slug: string,
  ) {
    return this.organizationService.createOrganization(user.id, name, slug);
  }

  @Post('invites/accept')
  async acceptInvite(
    @Body('token') token: string,
    @CurrentUser() user: User,
  ) {
    return this.organizationService.acceptInvite(token, user.id);
  }

  // Rutas contextuais baseadas em slug
  @Get(':orgSlug')
  @UseGuards(MembershipGuard)
  async getOrganization(@CurrentOrg() org: Organization) {
    return org;
  }

  @Patch(':orgSlug')
  @UseGuards(MembershipGuard)
  @Roles('OWNER', 'ADMIN')
  async updateOrganization(
    @CurrentOrg() org: Organization,
    @Body() data: { name?: string, avatarUrl?: string, brandColor?: string }
  ) {
    return this.organizationService.updateOrganization(org.id, data);
  }

  @Get(':orgSlug/members')
  @UseGuards(MembershipGuard)
  async getMembers(@CurrentOrg() org: Organization) {
    return this.organizationService.getMembers(org.id);
  }

  @Post(':orgSlug/invites')
  @UseGuards(MembershipGuard)
  @Roles('OWNER', 'ADMIN')
  async inviteMember(
    @CurrentOrg() org: Organization,
    @Body('email') email: string,
    @Body('role') role: Role,
    @CurrentUser() user: User,
  ) {
    return this.organizationService.inviteMember(org.id, email, role, user.id);
  }
}
