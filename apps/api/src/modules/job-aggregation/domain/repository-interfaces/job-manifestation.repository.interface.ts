import { JobManifestation } from '../entities/job-manifestation.entity';

export interface IJobManifestationRepository {
  save(jobManifestation: JobManifestation): Promise<JobManifestation>;
  findById(id: string): Promise<JobManifestation | null>;
  findByFingerprint(organizationId: string, fingerprint: string): Promise<JobManifestation | null>;
  findByOrganizationId(organizationId: string): Promise<JobManifestation[]>;
  findPaged(params: {
    organizationId: string;
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }): Promise<{ items: JobManifestation[]; total: number }>;
  findPagedCursor(params: {
    organizationId: string;
    limit: number;
    cursor?: string;
    search?: string;
    status?: string;
  }): Promise<{ items: JobManifestation[]; nextCursor: string | null }>;
  delete(id: string): Promise<void>;
}
export const IJobManifestationRepositoryToken = 'IJobManifestationRepository';
