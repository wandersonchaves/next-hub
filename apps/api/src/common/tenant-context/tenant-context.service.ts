import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  branchId?: string;
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

  get branchId(): string | undefined {
    return this.context?.branchId;
  }

  get userId(): string | undefined {
    return this.context?.userId;
  }
}
