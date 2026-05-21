import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async listExtensions() {
    return this.prisma.client.marketplaceExtension.findMany();
  }

  async installExtension(extensionId: string, organizationId: string) {
    const extension = await this.prisma.client.marketplaceExtension.findUnique({
      where: { id: extensionId },
    });

    if (!extension) throw new NotFoundException('Extension not found');

    const existingInstallation = await this.prisma.client.installedExtension.findUnique({
      where: {
        extensionId_organizationId: { extensionId, organizationId },
      },
    });

    if (existingInstallation) throw new ConflictException('Extension already installed');

    return this.prisma.client.installedExtension.create({
      data: {
        extensionId,
        organizationId,
        active: true,
      },
    });
  }

  async updateConfig(extensionId: string, organizationId: string, config: any) {
    return this.prisma.client.installedExtension.update({
      where: {
        extensionId_organizationId: { extensionId, organizationId },
      },
      data: { config },
    });
  }
}
