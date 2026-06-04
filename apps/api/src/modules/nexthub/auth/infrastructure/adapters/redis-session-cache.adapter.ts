import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ISessionCache, SessionMetadata } from '../../application/ports/session-cache.port';

@Injectable()
export class RedisSessionCacheAdapter implements ISessionCache {
  private readonly PREFIX = 'session:';
  private readonly USER_INDEX_PREFIX = 'user_sessions:';

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async saveSession(token: string, metadata: SessionMetadata, ttlSeconds: number): Promise<void> {
    const sessionKey = `${this.PREFIX}${token}`;
    // cache-manager v5 set takes ttl in milliseconds
    await this.cacheManager.set(sessionKey, metadata, ttlSeconds * 1000);

    // Keep an index of tokens per user for easy revocation
    const userIndexKey = `${this.USER_INDEX_PREFIX}${metadata.userId}`;
    const userTokens: string[] = (await this.cacheManager.get(userIndexKey)) || [];
    if (!userTokens.includes(token)) {
      userTokens.push(token);
      // set TTL of index slightly longer than session
      await this.cacheManager.set(userIndexKey, userTokens, (ttlSeconds + 60) * 1000);
    }
  }

  async getSession(token: string): Promise<SessionMetadata | null> {
    const sessionKey = `${this.PREFIX}${token}`;
    const data = await this.cacheManager.get<SessionMetadata>(sessionKey);
    return data || null;
  }

  async revokeSession(token: string): Promise<void> {
    const sessionKey = `${this.PREFIX}${token}`;
    const session = await this.getSession(token);
    
    await this.cacheManager.del(sessionKey);

    if (session) {
      const userIndexKey = `${this.USER_INDEX_PREFIX}${session.userId}`;
      let userTokens: string[] = (await this.cacheManager.get(userIndexKey)) || [];
      userTokens = userTokens.filter(t => t !== token);
      await this.cacheManager.set(userIndexKey, userTokens, 86400 * 1000); // 1 day
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const userIndexKey = `${this.USER_INDEX_PREFIX}${userId}`;
    const userTokens: string[] = (await this.cacheManager.get(userIndexKey)) || [];

    for (const token of userTokens) {
      await this.cacheManager.del(`${this.PREFIX}${token}`);
    }

    await this.cacheManager.del(userIndexKey);
  }
}
