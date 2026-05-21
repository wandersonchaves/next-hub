import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Webhook } from 'svix';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('svix-id') id: string,
    @Headers('svix-timestamp') timestamp: string,
    @Headers('svix-signature') signature: string,
  ) {
    const secret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

    if (!secret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    const wh = new Webhook(secret);
    let evt: any;

    try {
      evt = wh.verify(JSON.stringify(payload), {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      }) as any;
    } catch (err) {
      throw new BadRequestException('Invalid signature');
    }

    const { type, data } = evt;

    switch (type) {
      case 'user.created':
        await this.prisma.client.user.create({
          data: {
            clerkId: data.id,
            email: data.email_addresses[0].email_address,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            avatarUrl: data.image_url,
          },
        });
        break;

      case 'user.updated':
        await this.prisma.client.user.update({
          where: { clerkId: data.id },
          data: {
            email: data.email_addresses[0].email_address,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            avatarUrl: data.image_url,
          },
        });
        break;

      case 'organization.created':
        await this.prisma.client.organization.create({
          data: {
            clerkId: data.id,
            name: data.name,
            slug: data.slug || `org-${data.id}`,
            avatarUrl: data.image_url,
          },
        });
        break;

      case 'organizationMembership.created':
        const user = await this.prisma.client.user.findUnique({
          where: { clerkId: data.public_user_data.user_id },
        });
        const org = await this.prisma.client.organization.findUnique({
          where: { clerkId: data.organization.id },
        });

        if (user && org) {
          await this.prisma.client.member.upsert({
            where: {
              organizationId_userId: {
                organizationId: org.id,
                userId: user.id,
              },
            },
            update: {
              role: this.mapClerkRoleToPrisma(data.role),
            },
            create: {
              organizationId: org.id,
              userId: user.id,
              role: this.mapClerkRoleToPrisma(data.role),
            },
          });
        }
        break;
    }

    return { success: true };
  }

  private mapClerkRoleToPrisma(clerkRole: string): any {
    const roles = {
      'org:admin': 'ADMIN',
      'org:member': 'MEMBER',
      'org:owner': 'OWNER',
    };
    return roles[clerkRole] || 'MEMBER';
  }
}
