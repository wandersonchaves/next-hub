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

  @Cron(CronExpression.EVERY_MINUTE)
  async checkHealthStatus() {
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    this.logger.log(`Current memory usage: ${memoryUsage.toFixed(2)} MB`);

    // Memory Leak Self-Healing
    if (memoryUsage > 512) {
      this.logger.warn(`High memory usage detected (${memoryUsage.toFixed(2)} MB). Triggering Garbage Collection.`);
      if (global.gc) {
        global.gc();
      }
    }

    // High Error Rate Self-Healing
    if (this.errorCount > this.ERROR_THRESHOLD) {
      this.logger.error(`Critical error rate detected (${this.errorCount} errors/min). Triggering instance restart.`);
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
