import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AutoScalingService implements OnModuleInit {
  private readonly logger = new Logger(AutoScalingService.name);
  private prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

  onModuleInit() {
    this.logger.log('AutoScaling Intelligence initialized');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorClusterLoad() {
    try {
      // Query Prometheus for average CPU usage across the API nodes
      const query = 'avg(rate(process_cpu_seconds_total[5m])) * 100';
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`);
      
      const cpuUsage = parseFloat(response.data?.data?.result[0]?.value[1] || '0');
      
      if (cpuUsage > 70) {
        this.logger.warn(`High CPU Usage detected (${cpuUsage}%). Recommending SCALE UP.`);
        await this.triggerScaling('UP');
      } else if (cpuUsage < 20) {
        this.logger.log(`Low CPU Usage detected (${cpuUsage}%). Recommending SCALE DOWN.`);
        await this.triggerScaling('DOWN');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error monitoring cluster load: ${message}`);
    }
  }

  private async triggerScaling(direction: 'UP' | 'DOWN') {
    // In a production environment, this could trigger an AWS SDK call or a webhook to a k8s operator
    this.logger.log(`Executing Autoscale ${direction} command...`);
  }
}
