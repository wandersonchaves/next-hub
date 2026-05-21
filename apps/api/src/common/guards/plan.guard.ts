import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Plan } from '@enterprise/database';
import { PLANS_KEY } from '../decorators/plans.decorator';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlans = this.reflector.getAllAndOverride<Plan[]>(PLANS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlans || requiredPlans.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId = request.headers['organization-id'];

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const subscription = await this.prisma.client.subscription.findUnique({
      where: { organizationId },
    });

    const currentPlan = subscription?.plan || 'FREE';

    const hasPlan = requiredPlans.includes(currentPlan as Plan);

    if (!hasPlan) {
      throw new ForbiddenException(`This feature requires one of the following plans: ${requiredPlans.join(', ')}`);
    }

    return true;
  }
}
