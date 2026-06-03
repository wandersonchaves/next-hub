import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type VerticalModule = 'PROSPECTOR' | 'HEALTH' | 'PET' | 'CORE';

export interface TenantSaaSSnapshot {
  organizationId: string;
  isBlocked: boolean;
  status: string;
  activeModules: VerticalModule[];
  plan: string;
  units: { id: string; name: string; type: string }[];
}

@Injectable()
export class SaaSControlService {
  private readonly logger = new Logger(SaaSControlService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the current SaaS snapshot for a tenant, identifying blocked status and active modules.
   */
  async getTenantSnapshot(organizationId: string, userId?: string): Promise<TenantSaaSSnapshot> {
    const org = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
      include: { 
        subscription: true,
        units: true
      }
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    // Active modules are derived from the organization's enabledModules field.
    const activeModules = (org.enabledModules as VerticalModule[]) || ['CORE'];

    // Filter units based on user permissions if userId is provided
    let units = org.units.map(u => ({ id: u.id, name: u.name, type: u.type }));
    
    if (userId) {
      const userPermissions = await this.prisma.client.userOrganizationUnit.findMany({
        where: { userId, organizationId }
      });
      
      const allowedUnitIds = userPermissions.map(p => p.unitId);
      
      // If user has specific unit permissions, filter. 
      // If no specific unit permissions but they are a member, they might have org-level access (handled by guards).
      if (allowedUnitIds.length > 0) {
        units = units.filter(u => allowedUnitIds.includes(u.id));
      }
    }

    return {
      organizationId: org.id,
      isBlocked: org.status === 'SUSPENDED' || org.status === 'INACTIVE', 
      status: org.status,
      activeModules,
      plan: org.subscription?.plan || 'FREE',
      units
    };
  }

  async validateModuleAccess(organizationId: string, requiredModule: VerticalModule): Promise<boolean> {
    const snapshot = await this.getTenantSnapshot(organizationId);
    
    if (snapshot.isBlocked) {
      return false;
    }

    if (!snapshot.activeModules.includes(requiredModule)) {
      this.logger.warn(`Access denied for ${organizationId}: Module ${requiredModule} not licensed`);
      return false;
    }

    return true;
  }
}
