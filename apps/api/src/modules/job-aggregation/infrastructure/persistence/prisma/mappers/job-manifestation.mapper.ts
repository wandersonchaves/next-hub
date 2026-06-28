import { JobManifestation as PrismaJobManifestation, Prisma } from '@enterprise/database';
import { JobManifestation } from '../../../../domain/entities/job-manifestation.entity';
import { Fingerprint } from '../../../../domain/value-objects/fingerprint.vo';
import { CompensationRange } from '../../../../domain/value-objects/compensation-range.vo';

export class JobManifestationMapper {
  static toDomain(raw: PrismaJobManifestation): JobManifestation {
    return new JobManifestation(
      raw.id,
      raw.title,
      raw.company,
      raw.location,
      raw.description,
      raw.url,
      Fingerprint.create(raw.fingerprint),
      CompensationRange.create(
        raw.minSalary ? Number(raw.minSalary) : null,
        raw.maxSalary ? Number(raw.maxSalary) : null,
        raw.currency,
      ),
      raw.provider,
      raw.organizationId,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistence(domain: JobManifestation): Prisma.JobManifestationUncheckedCreateInput {
    return {
      id: domain.id || undefined,
      title: domain.title,
      company: domain.company,
      location: domain.location,
      description: domain.description,
      url: domain.url,
      fingerprint: domain.fingerprint.value,
      minSalary: domain.compensation.min !== null ? new Prisma.Decimal(domain.compensation.min) : null,
      maxSalary: domain.compensation.max !== null ? new Prisma.Decimal(domain.compensation.max) : null,
      currency: domain.compensation.currency,
      provider: domain.provider,
      organizationId: domain.organizationId,
    };
  }
}
