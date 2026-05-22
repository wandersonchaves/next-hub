import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
const Stripe = require('stripe');

@Injectable()
export class BillingService {
  private stripe: any;
  private readonly logger = new Logger(BillingService.name);

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(organizationId: string, plan: string) {
    const organization = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!organization) throw new Error('Organization not found');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env[`STRIPE_PRICE_ID_${plan.toUpperCase()}`],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?canceled=true`,
      customer: organization.subscription?.stripeCustomerId || undefined,
      client_reference_id: organizationId,
      subscription_data: {
        metadata: { organizationId },
      },
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook signature verification failed: ${message}`);
      throw new Error('Webhook Error');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
    }
  }

  private async handleCheckoutCompleted(session: any) {
    const organizationId = session.client_reference_id;
    if (!organizationId) return;

    await this.prisma.client.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        plan: 'PRO',
        status: 'ACTIVE',
      },
      update: {
        stripeSubscriptionId: session.subscription as string,
        status: 'ACTIVE',
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: any) {
    await this.prisma.client.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'CANCELED', plan: 'FREE' },
    });
  }
}
