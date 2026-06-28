import { StackCriteria } from '../value-objects/stack-criteria.vo';

export class LeadTarget {
  constructor(
    public readonly id: string | null,
    public readonly leadId: string,
    public readonly desiredRole: string,
    public readonly desiredSalary: number | null,
    public readonly skills: StackCriteria,
    public readonly experienceYears: number,
    public readonly organizationId: string,
    public readonly createdAt: Date | null = null,
    public readonly updatedAt: Date | null = null,
  ) {}

  static create(params: {
    leadId: string;
    desiredRole: string;
    desiredSalary: number | null;
    skills: string[];
    experienceYears: number;
    organizationId: string;
  }): LeadTarget {
    return new LeadTarget(
      null,
      params.leadId,
      params.desiredRole,
      params.desiredSalary,
      StackCriteria.create(params.skills),
      params.experienceYears,
      params.organizationId,
    );
  }
}
