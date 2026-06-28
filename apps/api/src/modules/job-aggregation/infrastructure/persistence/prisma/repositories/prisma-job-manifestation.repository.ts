import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { IJobManifestationRepository } from '../../../../domain/repository-interfaces/job-manifestation.repository.interface';
import { JobManifestation } from '../../../../domain/entities/job-manifestation.entity';
import { JobManifestationMapper } from '../mappers/job-manifestation.mapper';

@Injectable()
export class PrismaJobManifestationRepository implements IJobManifestationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(jobManifestation: JobManifestation): Promise<JobManifestation> {
    const data = JobManifestationMapper.toPersistence(jobManifestation);

    const record = await this.prisma.client.jobManifestation.upsert({
      where: {
        id: jobManifestation.id || 'new',
      },
      update: {
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        url: data.url,
        minSalary: data.minSalary,
        maxSalary: data.maxSalary,
        currency: data.currency,
        provider: data.provider,
      },
      create: data,
    });

    return JobManifestationMapper.toDomain(record);
  }

  async findById(id: string): Promise<JobManifestation | null> {
    const record = await this.prisma.client.jobManifestation.findUnique({
      where: {
        id,
      },
    });

    if (!record) {
      return null;
    }

    return JobManifestationMapper.toDomain(record);
  }

  async findByFingerprint(organizationId: string, fingerprint: string): Promise<JobManifestation | null> {
    const record = await this.prisma.client.jobManifestation.findFirst({
      where: {
        organizationId,
        fingerprint,
      },
    });

    if (!record) {
      return null;
    }

    return JobManifestationMapper.toDomain(record);
  }

  async findByOrganizationId(organizationId: string): Promise<JobManifestation[]> {
    const records = await this.prisma.client.jobManifestation.findMany({
      where: {
        organizationId,
      },
    });

    return records.map(record => JobManifestationMapper.toDomain(record));
  }

  async findPaged(params: {
    organizationId: string;
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }): Promise<{ items: JobManifestation[]; total: number }> {
    const { organizationId, page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.provider = { contains: status, mode: 'insensitive' };
    }

    const [records, total] = await Promise.all([
      this.prisma.client.jobManifestation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.jobManifestation.count({
        where,
      }),
    ]);

    return {
      items: records.map(record => JobManifestationMapper.toDomain(record)),
      total,
    };
  }

  async findPagedCursor(params: {
    organizationId: string;
    limit: number;
    cursor?: string;
    search?: string;
    status?: string;
  }): Promise<{ items: JobManifestation[]; nextCursor: string | null }> {
    const { organizationId, limit, cursor, search, status } = params;

    const where: any = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.provider = { contains: status, mode: 'insensitive' };
    }

    const records = await this.prisma.client.jobManifestation.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
      orderBy: { id: 'asc' },
    });

    let nextCursor: string | null = null;
    const items = records.slice(0, limit);

    if (records.length > limit) {
      nextCursor = records[limit].id;
    }

    return {
      items: items.map(record => JobManifestationMapper.toDomain(record)),
      nextCursor,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.jobManifestation.delete({
      where: {
        id,
      },
    });
  }
}
