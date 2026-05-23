import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext } from '@enterprise/database';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Prioritize the database ID resolved by Guards
    const resolvedOrgId = request.organization?.id;
    const headerOrgId = request.headers['x-organization-id'] || request.headers['organization-id'];
    
    const organizationId = resolvedOrgId || headerOrgId;
    const branchId = request.headers['x-branch-id'] || request.headers['branch-id'];

    if (organizationId) {
      return tenantContext.run({
        organizationId: organizationId as string,
        branchId: branchId as string | undefined
      }, () => next.handle());
    }

    return next.handle();
  }
}
