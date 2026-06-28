import { Injectable } from '@nestjs/common';
import { IExternalJobProvider } from '../../application/ports/external-job-provider.port';
import { JobManifestation } from '../../domain/entities/job-manifestation.entity';

@Injectable()
export class MockExternalJobProvider implements IExternalJobProvider {
  async fetchJobs(organizationId: string, query: string, limit: number = 10): Promise<JobManifestation[]> {
    const jobs: JobManifestation[] = [];
    const providers = ['linkedin', 'indeed', 'glassdoor', 'next-hub-internal'];

    for (let i = 1; i <= limit; i++) {
      const title = `${query} Developer #${i}`;
      const company = `InnovateTech Group ${i}`;
      const location = i % 2 === 0 ? 'Remote' : 'New York, NY';
      const description = `This is a premium opportunity for a ${query} role at InnovateTech. We require 3+ years of experience and deep expertise.`;
      const url = `https://example.com/jobs/${organizationId}/${i}`;
      const provider = providers[i % providers.length];
      
      const minSalary = 80000 + (i * 5000);
      const maxSalary = 120000 + (i * 5000);
      const currency = 'USD';

      jobs.push(
        JobManifestation.create({
          title,
          company,
          location,
          description,
          url,
          provider,
          organizationId,
          compensation: { min: minSalary, max: maxSalary, currency },
        })
      );
    }

    return jobs;
  }
}
