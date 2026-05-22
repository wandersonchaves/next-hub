import { Module } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { SandboxService } from './sandbox.service';

@Module({
  providers: [PluginsService, SandboxService],
  exports: [PluginsService],
})
export class PluginsModule { }
