import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(organizationId: string) {
    const [membersCount, documentsCount, activeInvites] = await Promise.all([
      this.prisma.client.member.count({ where: { organizationId } }),
      this.prisma.client.document.count({ where: { organizationId } }),
      this.prisma.client.invite.count({ where: { organizationId, expiresAt: { gt: new Date() } } }),
    ]);

    // Simulação de dados de série temporal
    const growthData = [
      { date: '2024-01', value: 10 },
      { date: '2024-02', value: 25 },
      { date: '2024-03', value: 45 },
      { date: '2024-04', value: membersCount },
    ];

    return {
      overview: {
        membersCount,
        documentsCount,
        activeInvites,
      },
      growthData,
    };
  }
}
