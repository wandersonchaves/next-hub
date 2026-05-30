import { SetMetadata } from '@nestjs/common';
import { VerticalModule } from '../../modules/nexthub/saas-control/saas-control.service';

export const MODULE_KEY = 'requiredModule';
export const RequireModule = (module: VerticalModule) => SetMetadata(MODULE_KEY, module);
