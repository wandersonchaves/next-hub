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
import { ISessionCacheToken } from '../../modules/nexthub/auth/application/ports/session-cache.port';

// Use import type specifically for interfaces in decorated constructors
import type { ITokenService } from '../../modules/nexthub/auth/application/ports/token-service.port';
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
      throw new UnauthorizedException('Token de autenticação não fornecido no Header.');
    }

    // 1. Validar a assinatura do token
    const payload = await this.tokenService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('A sua sessão expirou ou o segredo de segurança foi alterado. Por favor, faça login novamente para sincronizar.');
    }

    // 2. Buscar metadados da sessão no Redis
    const session = await this.sessionCache.getSession(token);
    if (!session) {
      throw new UnauthorizedException('Sessão não localizada no cache. Por favor, realize o login novamente.');
    }

    // 3. Injetar usuário e memberships no request (Compatibilidade com Guards Legados)
    const user = { 
      id: session.userId, 
      email: session.email,
      memberships: session.memberships 
    };
    request['user'] = user;

    // Headers
    const companyId = request.headers['x-company-id'] || request.headers['x-organization-id'] || request.headers['organization-id'];
    const unitId = request.headers['x-unit-id'] || request.headers['unit-id'];

    // 4. RULE: Super-Admin Bypass
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
      return true; 
    }

    // 5. RULE: Client Isolation & Permission Check
    const activeMembership = session.memberships.find(m => m.organizationId === companyId);
    
    if (!activeMembership) {
      throw new ForbiddenException(`Acesso negado à organização ${companyId}. Você não possui permissão para este Tenant.`);
    }

    // Populate organization and membership for use in services/controllers
    request['organization'] = { id: activeMembership.organizationId, slug: activeMembership.organizationSlug };
    request['membership'] = activeMembership;

    if (unitId) {
      const activeUnit = activeMembership.units.find(u => u.unitId === unitId);
      if (!activeUnit) {
        throw new NotFoundException('Unidade não localizada ou acesso negado.');
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
