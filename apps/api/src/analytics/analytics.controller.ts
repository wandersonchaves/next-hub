import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { HttpCacheInterceptor } from '../common/interceptors/http-cache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';
import { ClerkGuard } from '../common/guards/clerk.guard';
import { MembershipGuard } from '../common/guards/membership.guard';
import { CurrentOrg } from '../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';

@Controller('analytics')
@UseGuards(ClerkGuard, MembershipGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300) // 5 minutes cache for dashboard stats
  async getDashboard(@CurrentOrg() org: Organization) {
    return this.analyticsService.getDashboardStats(org.id);
  }
}
