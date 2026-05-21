import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataLakeService {
  private readonly logger = new Logger(DataLakeService.name);

  constructor(private prisma: PrismaService) {}

  async generateGlobalBenchmarks() {
    this.logger.log('Generating anonymized global benchmarks...');

    // Aggregating data across all tenants, but removing identifiable IDs
    const stats = await this.prisma.client.document.groupBy({
      by: ['organizationId'],
      _count: {
        _all: true,
      },
    });

    const averageDocumentsPerTenant = stats.reduce((acc, curr) => acc + curr._count._all, 0) / stats.length;

    // Save to an anonymous analytics table or external Data Lake
    this.logger.log(`Market Benchmark: Average documents per tenant: ${averageDocumentsPerTenant}`);
    
    return {
      averageDocumentsPerTenant,
      totalTenants: stats.length,
    };
  }
}
