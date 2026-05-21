import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing API Key');
    }

    // In a production app, we would hash the incoming key before comparing
    const keyData = await this.prisma.client.apiKey.findUnique({
      where: { key: apiKey as string },
      include: { organization: true },
    });

    if (!keyData) {
      throw new UnauthorizedException('Invalid API Key');
    }

    // Inject organization context into the request
    request.organization = keyData.organization;
    request.headers['organization-id'] = keyData.organizationId;

    return true;
  }
}
