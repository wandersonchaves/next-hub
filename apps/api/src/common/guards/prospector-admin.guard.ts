import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProspectorAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const adminId = this.configService.get<string>('ADMIN_ID');
    const isSuperAdmin = user && (
      (adminId && (user.id === adminId || user.clerkId === adminId)) ||
      (user.email && user.email.endsWith('@nexthub.com'))
    );

    if (!isSuperAdmin) {
      // Completely hide the existence of the Prospector module for non-admins
      throw new NotFoundException('Recurso não localizado.');
    }

    return true;
  }
}
