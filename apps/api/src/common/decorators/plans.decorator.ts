import { SetMetadata } from '@nestjs/common';
import { Plan } from '@enterprise/database';

export const PLANS_KEY = 'plans';
export const RequiredPlans = (...plans: Plan[]) => SetMetadata(PLANS_KEY, plans);
