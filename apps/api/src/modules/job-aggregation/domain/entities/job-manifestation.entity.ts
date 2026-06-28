import { Fingerprint } from '../value-objects/fingerprint.vo';
import { CompensationRange } from '../value-objects/compensation-range.vo';

export class JobManifestation {
  constructor(
    public readonly id: string | null,
    public readonly title: string,
    public readonly company: string,
    public readonly location: string,
    public readonly description: string,
    public readonly url: string,
    public readonly fingerprint: Fingerprint,
    public readonly compensation: CompensationRange,
    public readonly provider: string,
    public readonly organizationId: string,
    public readonly createdAt: Date | null = null,
    public readonly updatedAt: Date | null = null,
  ) {}

  static create(params: {
    title: string;
    company: string;
    location: string;
    description: string;
    url: string;
    provider: string;
    organizationId: string;
    compensation?: { min: number | null; max: number | null; currency: string | null };
    fingerprint?: string;
  }): JobManifestation {
    const computedFingerprint = params.fingerprint
      ? Fingerprint.create(params.fingerprint)
      : Fingerprint.generate(params.title, params.company, params.description);

    const comp = params.compensation
      ? CompensationRange.create(params.compensation.min, params.compensation.max, params.compensation.currency)
      : CompensationRange.empty();

    return new JobManifestation(
      null,
      params.title,
      params.company,
      params.location,
      params.description,
      params.url,
      computedFingerprint,
      comp,
      params.provider,
      params.organizationId,
    );
  }
}
