import { Controller, Post, Body, Headers, Req, BadRequestException, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { BillingService } from './billing.service';
import type { Request } from 'express';
import { MultiLevelAuthGuard } from '../../../common/guards/multi-level-auth.guard';
import { MembershipGuard } from '../../../common/guards/membership.guard';
import { CurrentOrg } from '../../../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(MultiLevelAuthGuard, MembershipGuard)
  async createCheckout(
    @CurrentOrg() org: Organization, 
    @Body('plan') plan: string
  ) {
    if (!org) throw new BadRequestException('Organization context missing');
    return this.billingService.createCheckoutSession(org.id, plan);
  }

  @Post('webhook')
  async webhook(@Headers('stripe-signature') signature: string, @Req() req: RawBodyRequest<Request>) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    
    const body = req.rawBody;
    if (!body) {
      throw new BadRequestException('Missing raw body');
    }

    await this.billingService.handleWebhook(signature, body);
    return { received: true };
  }
}
