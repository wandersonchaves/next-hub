import { URL } from 'url';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

  if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      };
    } catch (error) {
      // Fallback on parsing error
    }
  }

  // Fallback to separate env variables
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
}
