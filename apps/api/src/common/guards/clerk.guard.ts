import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClerkGuard implements CanActivate {
  private clerkClient;
  private secretKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.secretKey = this.configService.get<string>('CLERK_SECRET_KEY') || '';
    this.clerkClient = createClerkClient({
      secretKey: this.secretKey,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const sessionClaims = await verifyToken(token, {
        secretKey: this.secretKey,
      });

      const clerkUserId = sessionClaims.sub as string;
      const clerkOrgId = sessionClaims.org_id as string | undefined;

      // console.log(`Clerk Auth: User ${clerkUserId}, Org ${clerkOrgId}`);

      let user = await this.prisma.client.user.findUnique({
        where: { clerkId: clerkUserId },
        include: {
          memberships: {
            include: { organization: true }
          }
        }
      });

      if (!user) {
        const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        user = await this.prisma.client.user.upsert({
          where: { email },
          update: { clerkId: clerkUserId },
          create: {
            clerkId: clerkUserId,
            email: email,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
            avatarUrl: clerkUser.imageUrl,
          },
          include: {
            memberships: {
              include: { organization: true }
            }
          }
        });
      }

      request['user'] = user;

      // LAZY SYNC: Se o usuário não tem nenhuma membership no nosso banco, 
      // ou se temos um clerkOrgId ativo que ainda não está sincronizado, sincronizamos.
      const shouldSync = (user.memberships.length === 0) || (clerkOrgId && !user.memberships.find(m => m.organization.clerkId === clerkOrgId));

      if (shouldSync) {
        // console.log(`Syncing memberships for user ${clerkUserId}`);

        try {
          // Busca todas as memberships do usuário no Clerk
          const { data: clerkMemberships } = await this.clerkClient.users.getOrganizationMembershipList({
            userId: clerkUserId
          });

          for (const cm of clerkMemberships) {
            const org = await this.prisma.client.organization.upsert({
              where: { clerkId: cm.organization.id },
              update: {
                name: cm.organization.name,
                avatarUrl: cm.organization.imageUrl,
                slug: cm.organization.slug || undefined
              },
              create: {
                clerkId: cm.organization.id,
                name: cm.organization.name,
                slug: cm.organization.slug || `org-${cm.organization.id.substring(0, 8)}`,
                avatarUrl: cm.organization.imageUrl,
              }
            });

            await this.prisma.client.member.upsert({
              where: {
                organizationId_userId: {
                  userId: user.id,
                  organizationId: org.id
                }
              },
              update: { role: this.mapClerkRole(cm.role) as any },
              create: {
                userId: user.id,
                organizationId: org.id,
                role: this.mapClerkRole(cm.role) as any,
              }
            });
          }

          // Recarrega o usuário com as novas memberships para o restante da request
          user = await this.prisma.client.user.findUnique({
            where: { id: user.id },
            include: { memberships: { include: { organization: true } } }
          }) as any;
          request['user'] = user;
        } catch (syncError) {
          console.error('Failed to sync memberships from Clerk:', syncError);
        }
      }

      if (clerkOrgId && user) {
        const activeMembership = user.memberships.find(m => m.organization.clerkId === clerkOrgId);
        if (activeMembership) {
          request['organization'] = activeMembership.organization;
          request['membership'] = activeMembership;

          const branchId = request.headers['x-branch-id'] || request.headers['branch-id'];

          // Opcionalmente injeta no AsyncLocalStorage se for necessário dentro do Guard ou serviços chamados por ele
          // Nota: Interceptors são mais adequados para o ciclo de vida da request como um todo, 
          // mas Guards podem precisar disso se fizerem queries em tabelas tenant-aware.
          if (activeMembership.organization.id) {
            // Apenas um lembrete: o Interceptor também fará isso.
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Clerk Auth Guard Error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private mapClerkRole(clerkRole: string): string {
    if (!clerkRole) return 'MEMBER';

    switch (clerkRole.toLowerCase()) {
      case 'org:admin':
        return 'ADMIN';
      case 'org:member':
        return 'MEMBER';
      case 'org:owner':
        return 'OWNER';
      default:
        // Fallback para papéis customizados ou formatos diretos (ADMIN, MEMBER, etc)
        const parts = clerkRole.split(':');
        const roleName = (parts[parts.length - 1] || '').toUpperCase();

        const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'BILLING', 'VIEWER'];
        if (validRoles.includes(roleName)) {
          return roleName;
        }

        return 'MEMBER';
    }
  }
}
