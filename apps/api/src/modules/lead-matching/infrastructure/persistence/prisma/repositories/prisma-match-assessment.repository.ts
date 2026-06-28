import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { IMatchAssessmentRepository } from '../../../../domain/repository-interfaces/match-assessment.repository.interface';
import { MatchAssessment } from '../../../../domain/entities/match-assessment.entity';
import { LeadTarget } from '../../../../domain/entities/lead-target.entity';
import { MatchAssessmentMapper } from '../mappers/match-assessment.mapper';

@Injectable()
export class PrismaMatchAssessmentRepository implements IMatchAssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(assessment: MatchAssessment): Promise<MatchAssessment> {
    const data = MatchAssessmentMapper.toPersistence(assessment);

    const record = await this.prisma.client.matchAssessment.upsert({
      where: {
        leadId_jobManifestationId: {
          leadId: assessment.leadId,
          jobManifestationId: assessment.jobManifestationId,
        },
      },
      update: {
        score: data.score,
        explanation: data.explanation,
        matchedSkills: data.matchedSkills,
        missingSkills: data.missingSkills,
      },
      create: data,
    });

    return MatchAssessmentMapper.toDomain(record);
  }

  async saveLeadTarget(target: LeadTarget): Promise<LeadTarget> {
    const data = MatchAssessmentMapper.targetToPersistence(target);

    const record = await this.prisma.client.leadTarget.upsert({
      where: {
        leadId: target.leadId,
      },
      update: {
        desiredRole: data.desiredRole,
        desiredSalary: data.desiredSalary,
        skills: data.skills,
        experienceYears: data.experienceYears,
      },
      create: data,
    });

    return MatchAssessmentMapper.targetToDomain(record);
  }

  async findLeadTargetByLeadId(leadId: string): Promise<LeadTarget | null> {
    const record = await this.prisma.client.leadTarget.findUnique({
      where: {
        leadId,
      },
    });

    if (!record) return null;
    return MatchAssessmentMapper.targetToDomain(record);
  }

  async findLeadTargetsByOrganizationId(organizationId: string): Promise<LeadTarget[]> {
    const records = await this.prisma.client.leadTarget.findMany({
      where: {
        organizationId,
      },
    });

    return records.map(record => MatchAssessmentMapper.targetToDomain(record));
  }

  async findByLeadAndJob(leadId: string, jobManifestationId: string): Promise<MatchAssessment | null> {
    const record = await this.prisma.client.matchAssessment.findUnique({
      where: {
        leadId_jobManifestationId: {
          leadId,
          jobManifestationId,
        },
      },
    });

    if (!record) return null;
    return MatchAssessmentMapper.toDomain(record);
  }

  async findByOrganizationId(organizationId: string): Promise<MatchAssessment[]> {
    const records = await this.prisma.client.matchAssessment.findMany({
      where: {
        organizationId,
      },
    });

    return records.map(record => MatchAssessmentMapper.toDomain(record));
  }

  async findPagedCursor(params: {
    organizationId: string;
    limit: number;
    cursor?: string;
    minScore?: number;
  }): Promise<{ items: any[]; nextCursor: string | null }> {
    const { organizationId, limit, cursor, minScore } = params;

    const where: any = {
      organizationId,
    };

    if (minScore !== undefined) {
      where.score = {
        gte: minScore,
      };
    }

    const records = await this.prisma.client.matchAssessment.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
      orderBy: { id: 'desc' }, // Stable cursor-based pagination
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            minSalary: true,
            maxSalary: true,
            currency: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    const items = records.slice(0, limit);

    if (records.length > limit) {
      nextCursor = records[limit].id;
    }

    return {
      items: items.map(record => ({
        ...MatchAssessmentMapper.toDomain(record),
        lead: record.lead,
        job: record.job,
      })),
      nextCursor,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.matchAssessment.delete({
      where: {
        id,
      },
    });
  }
}
