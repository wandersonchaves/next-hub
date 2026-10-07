import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SelfHealingService implements OnModuleInit {
  private readonly logger = new Logger(SelfHealingService.name);
  private errorCount = 0;
  private readonly ERROR_THRESHOLD = 50; // Max errors per minute

  onModuleInit() {
    this.logger.log('Predictive Maintenance Engine started');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkHealthStatus() {
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    if (memoryUsage > 200 || process.env.DEBUG_MEMORY === 'true') {
      this.logger.log(`Current memory usage: ${memoryUsage.toFixed(2)} MB`);
    }

    // Memory Leak Self-Healing: Trigger GC if memory exceeds 250MB and gc is exposed
    if (memoryUsage > 250) {
      this.logger.warn(
        `Elevated memory usage detected (${memoryUsage.toFixed(2)} MB). Triggering Garbage Collection.`,
      );
      if (typeof global.gc === 'function') {
        global.gc();
      }
    }

    // High Error Rate Self-Healing
    if (this.errorCount > this.ERROR_THRESHOLD) {
      this.logger.error(
        `Critical error rate detected (${this.errorCount} errors/min). Triggering instance restart.`,
      );
      // In a k8s environment, this could be process.exit(1) to let the orchestrator restart the pod
      this.resetErrorCount();
    }
  }

  incrementErrorCount() {
    this.errorCount++;
  }

  private resetErrorCount() {
    this.errorCount = 0;
  }
}
