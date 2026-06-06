import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import type { IHashService } from '../ports/hash-service.port';
import { IHashServiceToken } from '../ports/hash-service.port';
import type { ITokenService } from '../ports/token-service.port';
import { ITokenServiceToken } from '../ports/token-service.port';
import type { ISessionCache } from '../ports/session-cache.port';
import { ISessionCacheToken } from '../ports/session-cache.port';

export interface LoginDto {
  email: string;
  password?: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IHashServiceToken) private readonly hashService: IHashService,
    @Inject(ITokenServiceToken) private readonly tokenService: ITokenService,
    @Inject(ISessionCacheToken) private readonly sessionCache: ISessionCache,
  ) {}

  async execute(dto: LoginDto) {
    const { email } = dto;

    // 1. Localizar usuário
    const user = await this.prisma.client.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true
          }
        },
        organizationUnits: true
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // 2. Gerar Token
    const payload = { sub: user.id, email: user.email };
    const token = this.tokenService.generateToken(payload);

    // 3. Preparar Metadados para o Cache (Redis)
    const sessionMetadata = {
      userId: user.id,
      email: user.email,
      memberships: user.memberships.map(m => ({
        organizationId: m.organizationId,
        organizationSlug: m.organization.slug,
        role: m.role,
        units: user.organizationUnits
          .filter(u => u.organizationId === m.organizationId)
          .map(u => ({ unitId: u.unitId, role: u.role }))
      }))
    };

    // 4. Salvar no Redis (TTL de 7 dias)
    await this.sessionCache.saveSession(token, sessionMetadata, 7 * 24 * 3600);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
      },
      memberships: sessionMetadata.memberships
    };
  }
}
