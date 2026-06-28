import { JobManifestation } from '../../domain/entities/job-manifestation.entity';

export interface IExternalJobProvider {
  fetchJobs(organizationId: string, query: string, limit?: number): Promise<JobManifestation[]>;
}
export const IExternalJobProviderToken = 'IExternalJobProvider';
