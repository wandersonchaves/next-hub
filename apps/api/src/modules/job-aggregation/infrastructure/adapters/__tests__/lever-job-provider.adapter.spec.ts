import { LeverJobProvider } from '../lever-job-provider.adapter';
import axios from 'axios';

jest.mock('axios');

describe('LeverJobProvider', () => {
  let provider: LeverJobProvider;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    provider = new LeverJobProvider();
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return mock jobs when in development/test with no token', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LEVER_SITE_TOKEN;

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(3);
    expect(result[0].title).toContain('Lever Mock');
    expect(result[0].company).toBe('Lever Mock Corp');
  });

  it('should return mock jobs when in test environment', async () => {
    process.env.NODE_ENV = 'test';
    process.env.LEVER_SITE_TOKEN = 'some-real-site';

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(3);
    expect(result[0].title).toContain('Lever Mock');
  });

  it('should throw an error in production if site token is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.LEVER_SITE_TOKEN;

    await expect(provider.fetchJobs('org-1', 'Software')).rejects.toThrow(
      'Lever site token is not configured for production environment',
    );
  });

  it('should throw an error in production if site token is the mock site token', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LEVER_SITE_TOKEN = 'lever-mock-site';

    await expect(provider.fetchJobs('org-1', 'Software')).rejects.toThrow(
      'Lever site token is not configured for production environment',
    );
  });

  it('should call external API in production when site token is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LEVER_SITE_TOKEN = 'real-site';

    const mockResponse = {
      data: [
        {
          text: 'Senior Software Specialist',
          categories: { location: 'Remote' },
          descriptionPlain: 'Great role',
          hostedUrl: 'https://example.com/job/1',
        },
      ],
    };
    (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Senior Software Specialist');
    expect(result[0].company).toBe('Lever Client Company');
    expect(axios.get).toHaveBeenCalledWith(
      'https://api.lever.co/v0/postings/real-site',
      expect.any(Object),
    );
  });

  it('should return empty array in production if API call fails (fallback)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LEVER_SITE_TOKEN = 'real-site';

    (axios.get as jest.Mock).mockRejectedValue(new Error('API Down'));

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toEqual([]);
  });

  it('should return fallback mock jobs in non-production if API call fails', async () => {
    process.env.NODE_ENV = 'development';
    process.env.LEVER_SITE_TOKEN = 'real-site';

    (axios.get as jest.Mock).mockRejectedValue(new Error('API Down'));

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(3);
    expect(result[0].title).toContain('Lever Fallback');
  });
});
