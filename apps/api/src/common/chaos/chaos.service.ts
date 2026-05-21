import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker = require('opossum');

@Injectable()
export class ChaosService {
  private readonly logger = new Logger(ChaosService.name);
  private breakers: Map<string, any> = new Map();
  private isChaosMonkeyEnabled = process.env.ENABLE_CHAOS_MONKEY === 'true';

  // Wrapper for any async operation with a Circuit Breaker
  async wrapWithBreaker<T>(
    serviceName: string,
    action: () => Promise<T>,
    fallback: () => T | Promise<T>
  ): Promise<T> {
    if (!this.breakers.has(serviceName)) {
      const breaker = new CircuitBreaker(action, {
        timeout: 3000, 
        errorThresholdPercentage: 50, 
        resetTimeout: 30000 
      });

      breaker.fallback(fallback);
      
      breaker.on('open', () => this.logger.warn(`Circuit for ${serviceName} is now OPEN`));
      breaker.on('close', () => this.logger.log(`Circuit for ${serviceName} is now CLOSED`));
      
      this.breakers.set(serviceName, breaker);
    }

    // Failure Injection (Chaos Monkey)
    if (this.isChaosMonkeyEnabled && Math.random() < 0.1) {
       this.logger.error(`Chaos Monkey: Injecting failure into ${serviceName}`);
       throw new Error(`Injected failure for ${serviceName}`);
    }

    return this.breakers.get(serviceName).fire() as Promise<T>;
  }
}
