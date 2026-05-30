import { Module, Global } from '@nestjs/common';
import { SaaSControlService } from './saas-control.service';
import { SaaSControlController } from './saas-control.controller';

@Global()
@Module({
  controllers: [SaaSControlController],
  providers: [SaaSControlService],
  exports: [SaaSControlService],
})
export class SaaSControlModule {}
