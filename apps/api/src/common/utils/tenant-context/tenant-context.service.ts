import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  unitId?: string;
  userId?: string;
}

@Injectable()
export class TenantContextService {
  private static readonly storage = new AsyncLocalStorage<TenantContext>();

  run(context: TenantContext, callback: () => void) {
    return TenantContextService.storage.run(context, callback);
  }

  get context(): TenantContext | undefined {
    return TenantContextService.storage.getStore();
  }

  get organizationId(): string | undefined {
    return this.context?.organizationId;
  }

  get unitId(): string | undefined {
    return this.context?.unitId;
  }

  get userId(): string | undefined {
    return this.context?.userId;
  }
}
