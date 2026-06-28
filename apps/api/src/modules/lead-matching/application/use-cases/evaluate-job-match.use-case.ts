import { Injectable, Logger, Inject } from '@nestjs/common';
import { IMatchAssessmentRepositoryToken } from '../../domain/repository-interfaces/match-assessment.repository.interface';
import type { IMatchAssessmentRepository } from '../../domain/repository-interfaces/match-assessment.repository.interface';
import { IJobManifestationRepositoryToken } from '../../../job-aggregation/domain/repository-interfaces/job-manifestation.repository.interface';
import type { IJobManifestationRepository } from '../../../job-aggregation/domain/repository-interfaces/job-manifestation.repository.interface';
import { MatchAssessment } from '../../domain/entities/match-assessment.entity';
import { ScoreBreakdown } from '../../domain/value-objects/score-breakdown.vo';

@Injectable()
export class EvaluateJobMatchUseCase {
  private readonly logger = new Logger(EvaluateJobMatchUseCase.name);

  constructor(
    @Inject(IMatchAssessmentRepositoryToken)
    private readonly matchRepository: IMatchAssessmentRepository,
    @Inject(IJobManifestationRepositoryToken)
    private readonly jobRepository: IJobManifestationRepository,
  ) {}

  async execute(params: {
    jobManifestationId: string;
    organizationId: string;
  }): Promise<void> {
    const { jobManifestationId, organizationId } = params;
    this.logger.log(`Evaluating matches for job ${jobManifestationId} (Organization: ${organizationId})`);

    const job = await this.jobRepository.findById(jobManifestationId);
    if (!job) {
      this.logger.warn(`Job manifestation ${jobManifestationId} not found. Skipping match evaluation.`);
      return;
    }

    const leadTargets = await this.matchRepository.findLeadTargetsByOrganizationId(organizationId);
    this.logger.log(`Found ${leadTargets.length} candidate targets to match against job "${job.title}"`);

    for (const target of leadTargets) {
      try {
        const roleMatches = job.title.toLowerCase().includes(target.desiredRole.toLowerCase()) || 
                            target.desiredRole.toLowerCase().includes(job.title.toLowerCase());
        const roleScore = roleMatches ? 100 : 30;

        const jobText = `${job.title} ${job.description}`.toLowerCase();
        const matched: string[] = [];
        const missing: string[] = [];

        for (const skill of target.skills.skills) {
          if (jobText.includes(skill)) {
            matched.push(skill);
          } else {
            missing.push(skill);
          }
        }

        const skillsScore = target.skills.skills.length > 0
          ? Math.round((matched.length / target.skills.skills.length) * 100)
          : 100;

        let salaryScore = 100;
        if (target.desiredSalary && job.compensation.min) {
          if (Number(job.compensation.min) >= target.desiredSalary) {
            salaryScore = 100;
          } else {
            const ratio = Number(job.compensation.min) / target.desiredSalary;
            salaryScore = Math.round(ratio * 100);
          }
        }

        const experienceScore = target.experienceYears >= 2 ? 100 : 70;

        const breakdown = ScoreBreakdown.create(roleScore, skillsScore, salaryScore, experienceScore);
        const finalScore = breakdown.average;

        const explanation = `Matched role: ${roleMatches ? 'Yes' : 'No'}. Skills matched: ${matched.join(', ') || 'none'}. Missing: ${missing.join(', ') || 'none'}. Salary match: ${salaryScore}%.`;

        const existingAssessment = await this.matchRepository.findByLeadAndJob(target.leadId, jobManifestationId);
        
        const assessmentToSave = new MatchAssessment(
          existingAssessment?.id || null,
          target.leadId,
          jobManifestationId,
          finalScore,
          explanation,
          matched,
          missing,
          organizationId,
        );

        await this.matchRepository.save(assessmentToSave);
        this.logger.debug(`Saved match assessment for lead ${target.leadId} and job ${jobManifestationId} (Score: ${finalScore})`);
      } catch (err) {
        this.logger.error(`Failed to evaluate match for lead ${target.leadId}: ${err.message}`);
      }
    }
  }
}
