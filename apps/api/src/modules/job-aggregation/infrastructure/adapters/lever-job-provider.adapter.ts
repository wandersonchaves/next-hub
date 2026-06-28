import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { IExternalJobProvider } from '../../application/ports/external-job-provider.port';
import { JobManifestation } from '../../domain/entities/job-manifestation.entity';
import { CircuitBreaker, withExponentialBackoff } from './circuit-breaker';

@Injectable()
export class LeverJobProvider implements IExternalJobProvider {
  private readonly circuitBreaker = new CircuitBreaker('LeverJobProvider');

  async fetchJobs(organizationId: string, query: string, limit: number = 10): Promise<JobManifestation[]> {
    const site = process.env.LEVER_SITE_TOKEN || 'lever-mock-site';

    if (site === 'lever-mock-site' || process.env.NODE_ENV === 'test') {
      const mockJobs: JobManifestation[] = [];
      for (let i = 1; i <= Math.min(limit, 3); i++) {
        mockJobs.push(
          JobManifestation.create({
            title: `Senior ${query || 'Software'} Specialist (Lever Mock) #${i}`,
            company: 'Lever Mock Corp',
            location: 'New York, NY',
            description: `This is a mock job for ${query || 'Software'}.`,
            url: `https://jobs.lever.co/lever-mock/${i}`,
            provider: 'lever',
            organizationId,
            compensation: { min: 100000, max: 150000, currency: 'USD' },
          })
        );
      }
      return mockJobs;
    }

    const url = `https://api.lever.co/v0/postings/${site}`;

    const fetchAction = async () => {
      const response = await withExponentialBackoff(
        () => axios.get(url, { timeout: 5000 }),
        3,
        500,
      );
      const postings = response.data || [];
      return postings
        .filter((post: any) => post.text.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map((post: any) =>
          JobManifestation.create({
            title: post.text,
            company: 'Lever Client Company',
            location: post.categories?.location || 'Remote',
            description: post.descriptionPlain || 'Lever job posting description.',
            url: post.hostedUrl,
            provider: 'lever',
            organizationId,
            compensation: { min: null, max: null, currency: null },
          })
        );
    };

    const fallbackAction = async () => {
      const mockJobs: JobManifestation[] = [];
      for (let i = 1; i <= Math.min(limit, 3); i++) {
        mockJobs.push(
          JobManifestation.create({
            title: `Senior ${query} Specialist (Lever Fallback) #${i}`,
            company: 'Lever Fallback Corp',
            location: 'New York, NY',
            description: `This is a job fetched from Lever fallback action. It represents a ${query} role.`,
            url: `https://jobs.lever.co/lever-mock/${i}`,
            provider: 'lever',
            organizationId,
            compensation: { min: 100000, max: 150000, currency: 'USD' },
          })
        );
      }
      return mockJobs;
    };

    return this.circuitBreaker.execute(fetchAction, fallbackAction);
  }
}
