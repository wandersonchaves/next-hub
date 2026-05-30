import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SandboxService } from './sandbox.service';

@Injectable()
export class PluginsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private sandbox: SandboxService,
  ) {}

  onModuleInit() {
    // In a real Event Mesh, this would subscribe to the event broker
    // For now, we provide a manual trigger for demonstration
  }

  async runPluginsForEvent(event: string, organizationId: string, payload: any) {
    const activePlugins = await this.prisma.client.plugin.findMany({
      where: {
        organizationId,
        active: true,
        events: { has: event },
      },
    });

    for (const plugin of activePlugins) {
      try {
        await this.sandbox.execute(plugin.code, { 
          event, 
          payload, 
          organizationId 
        });
      } catch (error) {
        // Log and continue to next plugin
      }
    }
  }
}
