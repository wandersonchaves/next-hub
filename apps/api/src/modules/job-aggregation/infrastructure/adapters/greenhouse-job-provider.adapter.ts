import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { IExternalJobProvider } from '../../application/ports/external-job-provider.port';
import { JobManifestation } from '../../domain/entities/job-manifestation.entity';
import { CircuitBreaker, withExponentialBackoff } from './circuit-breaker';

@Injectable()
export class GreenhouseJobProvider implements IExternalJobProvider {
  private readonly circuitBreaker = new CircuitBreaker('GreenhouseJobProvider');

  async fetchJobs(organizationId: string, query: string, limit: number = 10): Promise<JobManifestation[]> {
    const boardToken = process.env.GREENHOUSE_BOARD_TOKEN || 'greenhouse-mock-token';

    if (boardToken === 'greenhouse-mock-token' || process.env.NODE_ENV === 'test') {
      const mockJobs: JobManifestation[] = [];
      for (let i = 1; i <= Math.min(limit, 3); i++) {
        mockJobs.push(
          JobManifestation.create({
            title: `${query || 'Software'} Engineer (Greenhouse Mock) #${i}`,
            company: 'Greenhouse Mock Corp',
            location: 'San Francisco, CA',
            description: `This is a mock job for ${query || 'Software'}.`,
            url: `https://boards.greenhouse.io/greenhouse-mock/jobs/${i}`,
            provider: 'greenhouse',
            organizationId,
            compensation: { min: 90000, max: 130000, currency: 'USD' },
          })
        );
      }
      return mockJobs;
    }

    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`;

    const fetchAction = async () => {
      const response = await withExponentialBackoff(
        () => axios.get(url, { timeout: 5000 }),
        3,
        500,
      );
      const jobs = response.data.jobs || [];
      return jobs
        .filter((job: any) => job.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map((job: any) =>
          JobManifestation.create({
            title: job.title,
            company: 'Greenhouse Client Company',
            location: job.location?.name || 'Remote',
            description: job.content || 'Greenhouse job posting description.',
            url: job.absolute_url,
            provider: 'greenhouse',
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
            title: `${query} Engineer (Greenhouse Fallback) #${i}`,
            company: 'Greenhouse Fallback Corp',
            location: 'San Francisco, CA',
            description: `This is a job fetched from Greenhouse fallback action. It represents a ${query} role.`,
            url: `https://boards.greenhouse.io/greenhouse-mock/jobs/${i}`,
            provider: 'greenhouse',
            organizationId,
            compensation: { min: 90000, max: 130000, currency: 'USD' },
          })
        );
      }
      return mockJobs;
    };

    return this.circuitBreaker.execute(fetchAction, fallbackAction);
  }
}
