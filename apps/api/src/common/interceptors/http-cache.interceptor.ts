import {
  CacheInterceptor,
  CACHE_MANAGER,
  CACHE_KEY_METADATA,
} from '@nestjs/cache-manager';
import {
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Tenant-aware Cache Interceptor.
 * Ensures that different organizations do not share the same cache for the same URL.
 */
@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: any,
    protected readonly reflector: Reflector,
  ) {
    super(cacheManager, reflector);
  }

  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const requestMethod = request.method;
    
    if (requestMethod !== 'GET') {
      return undefined;
    }

    const cacheMetadata = this.reflector.get(CACHE_KEY_METADATA, context.getHandler());
    if (cacheMetadata) {
      return cacheMetadata;
    }

    const url = request.url;
    const orgId = request.headers['organization-id'] || 'no-org';
    const userId = request.user?.id || 'no-user';

    return `cache:${orgId}:${userId}:${url}`;
  }
}
