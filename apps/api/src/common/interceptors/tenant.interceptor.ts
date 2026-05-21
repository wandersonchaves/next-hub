import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext } from '@enterprise/database';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.headers['x-organization-id'] || request.headers['organization-id'];

    // In some cases, we might want to skip this for global routes (like profile management)
    // For now, let's assume it's optional but if present, it must be used.
    
    if (organizationId) {
      return tenantContext.run({ organizationId }, () => next.handle());
    }

    return next.handle();
  }
}
