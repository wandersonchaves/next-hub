import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type VerticalModule = 'PROSPECTOR' | 'HEALTH' | 'PET' | 'CORE';

export interface TenantSaaSSnapshot {
  organizationId: string;
  isBlocked: boolean;
  status: string;
  activeModules: VerticalModule[];
  plan: string;
}

@Injectable()
export class SaaSControlService {
  private readonly logger = new Logger(SaaSControlService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the current SaaS snapshot for a tenant, identifying blocked status and active modules.
   * In a real implementation, this would query the Subscription or Organization limits.
   */
  async getTenantSnapshot(organizationId: string): Promise<TenantSaaSSnapshot> {
    // For demo purposes, we will fetch the organization and simulate modules based on some properties or just return all for admins
    const org = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true }
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    // Active modules are derived from the organization's enabledModules field.
    const activeModules = (org.enabledModules as VerticalModule[]) || ['CORE'];

    return {
      organizationId: org.id,
      isBlocked: org.status === 'SUSPENDED' || org.status === 'INACTIVE', 
      status: org.status,
      activeModules,
      plan: org.subscription?.plan || 'FREE'
    };
  }

  async validateModuleAccess(organizationId: string, requiredModule: VerticalModule): Promise<boolean> {
    const snapshot = await this.getTenantSnapshot(organizationId);
    
    if (snapshot.isBlocked) {
      this.logger.warn(`Access denied for ${organizationId}: Tenant is blocked`);
      return false;
    }

    if (!snapshot.activeModules.includes(requiredModule)) {
      this.logger.warn(`Access denied for ${organizationId}: Module ${requiredModule} not licensed`);
      return false;
    }

    return true;
  }
}
