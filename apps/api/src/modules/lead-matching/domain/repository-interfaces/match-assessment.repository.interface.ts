import { MatchAssessment } from '../entities/match-assessment.entity';
import { LeadTarget } from '../entities/lead-target.entity';

export interface IMatchAssessmentRepository {
  save(assessment: MatchAssessment): Promise<MatchAssessment>;
  saveLeadTarget(target: LeadTarget): Promise<LeadTarget>;
  findLeadTargetByLeadId(leadId: string): Promise<LeadTarget | null>;
  findLeadTargetsByOrganizationId(organizationId: string): Promise<LeadTarget[]>;
  findByLeadAndJob(leadId: string, jobManifestationId: string): Promise<MatchAssessment | null>;
  findByOrganizationId(organizationId: string): Promise<MatchAssessment[]>;
  findPagedCursor(params: {
    organizationId: string;
    limit: number;
    cursor?: string;
    minScore?: number;
  }): Promise<{ items: any[]; nextCursor: string | null }>;
  delete(id: string): Promise<void>;
}
export const IMatchAssessmentRepositoryToken = 'IMatchAssessmentRepository';
