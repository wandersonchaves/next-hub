import { Module, Global } from '@nestjs/common';
import { ChaosService } from './chaos.service';

@Global()
@Module({
  providers: [ChaosService],
  exports: [ChaosService],
})
export class ChaosModule {}
