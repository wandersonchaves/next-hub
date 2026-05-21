import { Module } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { SandboxService } from './sandbox.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [PluginsService, SandboxService, PrismaService],
  exports: [PluginsService],
})
export class PluginsModule {}
