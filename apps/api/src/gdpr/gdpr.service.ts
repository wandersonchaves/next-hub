import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as archiver from 'archiver';
import { Response } from 'express';

@Injectable()
export class GdprService {
  constructor(private prisma: PrismaService) {}

  async deleteOrganizationData(organizationId: string) {
    // This will trigger cascade deletes based on the schema (onDelete: Cascade)
    await this.prisma.client.organization.delete({
      where: { id: organizationId },
    });
    return { success: true, message: 'All tenant data has been permanently erased.' };
  }

  async exportData(organizationId: string, res: Response) {
    const data = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: true,
        documents: true,
        auditLogs: true,
        webhooks: true,
      },
    });

    if (!data) throw new NotFoundException('Organization not found');

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment(`export-${organizationId}.zip`);

    archive.pipe(res);
    archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });
    
    await archive.finalize();
  }
}
