import { GreenhouseJobProvider } from '../greenhouse-job-provider.adapter';
import axios from 'axios';

jest.mock('axios');

describe('GreenhouseJobProvider', () => {
  let provider: GreenhouseJobProvider;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    provider = new GreenhouseJobProvider();
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return mock jobs when in development/test with no token', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.GREENHOUSE_BOARD_TOKEN;

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(3);
    expect(result[0].title).toContain('Greenhouse Mock');
    expect(result[0].company).toBe('Greenhouse Mock Corp');
  });

  it('should return mock jobs when in test environment', async () => {
    process.env.NODE_ENV = 'test';
    process.env.GREENHOUSE_BOARD_TOKEN = 'some-real-token';

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(3);
    expect(result[0].title).toContain('Greenhouse Mock');
  });

  it('should throw an error in production if token is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GREENHOUSE_BOARD_TOKEN;

    await expect(provider.fetchJobs('org-1', 'Software')).rejects.toThrow(
      'Greenhouse board token is not configured for production environment',
    );
  });

  it('should throw an error in production if token is the mock token', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GREENHOUSE_BOARD_TOKEN = 'greenhouse-mock-token';

    await expect(provider.fetchJobs('org-1', 'Software')).rejects.toThrow(
      'Greenhouse board token is not configured for production environment',
    );
  });

  it('should call external API in production when token is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GREENHOUSE_BOARD_TOKEN = 'real-token';

    const mockResponse = {
      data: {
        jobs: [
          {
            title: 'Software Engineer',
            location: { name: 'Remote' },
            content: 'Great role',
            absolute_url: 'https://example.com/job/1',
          },
        ],
      },
    };
    (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Software Engineer');
    expect(result[0].company).toBe('Greenhouse Client Company');
    expect(axios.get).toHaveBeenCalledWith(
      'https://boards-api.greenhouse.io/v1/boards/real-token/jobs',
      expect.any(Object),
    );
  });

  it('should return empty array in production if API call fails (fallback)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GREENHOUSE_BOARD_TOKEN = 'real-token';

    (axios.get as jest.Mock).mockRejectedValue(new Error('API Down'));

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toEqual([]);
  });

  it('should return fallback mock jobs in non-production if API call fails', async () => {
    process.env.NODE_ENV = 'development';
    process.env.GREENHOUSE_BOARD_TOKEN = 'real-token';

    (axios.get as jest.Mock).mockRejectedValue(new Error('API Down'));

    const result = await provider.fetchJobs('org-1', 'Software', 5);
    expect(result).toHaveLength(3);
    expect(result[0].title).toContain('Greenhouse Fallback');
  });
});
