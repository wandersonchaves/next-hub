import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ITokenServiceToken } from '../../modules/nexthub/auth/application/ports/token-service.port';
import type { ITokenService } from '../../modules/nexthub/auth/application/ports/token-service.port';
import { ISessionCacheToken } from '../../modules/nexthub/auth/application/ports/session-cache.port';
import type { ISessionCache } from '../../modules/nexthub/auth/application/ports/session-cache.port';

@Injectable()
export class MultiLevelAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(ITokenServiceToken) private readonly tokenService: ITokenService,
    @Inject(ISessionCacheToken) private readonly sessionCache: ISessionCache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    // 1. Validar a assinatura do token
    const payload = await this.tokenService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    // 2. Buscar metadados da sessão no Redis
    const session = await this.sessionCache.getSession(token);
    if (!session) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    // Injetar usuário sanitizado (compatível com controladores legados)
    const user = { id: session.userId, email: session.email };
    request['user'] = user;

    // Headers
    const companyId = request.headers['x-company-id'] || request.headers['x-organization-id'];
    const unitId = request.headers['x-unit-id'] || request.headers['unit-id'];

    // 3. RULE: Super-Admin Bypass
    const adminId = this.configService.get<string>('ADMIN_ID');
    const isSuperAdmin = user && (
      (adminId && (user.id === adminId)) ||
      (user.email && user.email.endsWith('@nexthub.com'))
    );

    if (isSuperAdmin) {
      if (companyId) {
        request['organization'] = { id: companyId };
      }
      return true;
    }

    if (!companyId) {
      // Allow execution for global routes (no specific org context required)
      return true; 
    }

    // 4. RULE: Client Isolation & Permission Check from Session Metadata (Redis)
    const activeMembership = session.memberships.find(m => m.organizationId === companyId);
    
    if (!activeMembership) {
      throw new ForbiddenException('Acesso negado à organização.');
    }

    request['organization'] = { id: activeMembership.organizationId, slug: activeMembership.organizationSlug };
    request['membership'] = activeMembership;

    if (unitId) {
      const activeUnit = activeMembership.units.find(u => u.unitId === unitId);
      if (!activeUnit) {
        // Return 404 to hide the existence of the resource (Unit) from unauthorized users
        throw new NotFoundException('Recurso não localizado ou acesso negado à unidade.');
      }
      request['unitPermission'] = activeUnit;
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
