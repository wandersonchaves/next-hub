import { ScoreBreakdown } from '../value-objects/score-breakdown.vo';

export class MatchAssessment {
  constructor(
    public readonly id: string | null,
    public readonly leadId: string,
    public readonly jobManifestationId: string,
    public readonly score: number,
    public readonly explanation: string,
    public readonly matchedSkills: string[],
    public readonly missingSkills: string[],
    public readonly organizationId: string,
    public readonly createdAt: Date | null = null,
    public readonly updatedAt: Date | null = null,
  ) {}

  static create(params: {
    leadId: string;
    jobManifestationId: string;
    score: number;
    explanation: string;
    matchedSkills: string[];
    missingSkills: string[];
    organizationId: string;
  }): MatchAssessment {
    return new MatchAssessment(
      null,
      params.leadId,
      params.jobManifestationId,
      params.score,
      params.explanation,
      params.matchedSkills,
      params.missingSkills,
      params.organizationId,
    );
  }
}
