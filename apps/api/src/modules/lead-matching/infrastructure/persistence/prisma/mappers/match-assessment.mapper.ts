import { MatchAssessment as PrismaMatchAssessment, LeadTarget as PrismaLeadTarget, Prisma } from '@enterprise/database';
import { MatchAssessment } from '../../../../domain/entities/match-assessment.entity';
import { LeadTarget } from '../../../../domain/entities/lead-target.entity';
import { StackCriteria } from '../../../../domain/value-objects/stack-criteria.vo';

export class MatchAssessmentMapper {
  static toDomain(raw: PrismaMatchAssessment): MatchAssessment {
    return new MatchAssessment(
      raw.id,
      raw.leadId,
      raw.jobManifestationId,
      raw.score,
      raw.explanation,
      raw.matchedSkills,
      raw.missingSkills,
      raw.organizationId,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistence(domain: MatchAssessment): Prisma.MatchAssessmentUncheckedCreateInput {
    return {
      id: domain.id || undefined,
      leadId: domain.leadId,
      jobManifestationId: domain.jobManifestationId,
      score: domain.score,
      explanation: domain.explanation,
      matchedSkills: domain.matchedSkills,
      missingSkills: domain.missingSkills,
      organizationId: domain.organizationId,
    };
  }

  static targetToDomain(raw: PrismaLeadTarget): LeadTarget {
    return new LeadTarget(
      raw.id,
      raw.leadId,
      raw.desiredRole,
      raw.desiredSalary ? Number(raw.desiredSalary) : null,
      StackCriteria.create(raw.skills),
      raw.experienceYears,
      raw.organizationId,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static targetToPersistence(domain: LeadTarget): Prisma.LeadTargetUncheckedCreateInput {
    return {
      id: domain.id || undefined,
      leadId: domain.leadId,
      desiredRole: domain.desiredRole,
      desiredSalary: domain.desiredSalary !== null ? new Prisma.Decimal(domain.desiredSalary) : null,
      skills: domain.skills.skills,
      experienceYears: domain.experienceYears,
      organizationId: domain.organizationId,
    };
  }
}
