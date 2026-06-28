import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private nextAttemptTime = 0;
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 3,
    private readonly resetTimeoutMs = 10000,
  ) {}

  async execute<T>(action: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === CircuitState.OPEN) {
      if (now > this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.warn(`Circuit Breaker [${this.name}] entering HALF_OPEN state. Testing service availability.`);
      } else {
        this.logger.debug(`Circuit Breaker [${this.name}] is OPEN. Fast-failing and executing fallback.`);
        return fallback();
      }
    }

    try {
      const result = await action();
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.logger.log(`Circuit Breaker [${this.name}] successfully recovered and is now CLOSED.`);
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.logger.error(`Circuit Breaker [${this.name}] failure recorded (${this.failureCount}/${this.failureThreshold}): ${error.message}`);
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
        this.logger.error(`Circuit Breaker [${this.name}] tripped to OPEN state. Reset timeout: ${this.resetTimeoutMs}ms.`);
      }

      return fallback();
    }
  }
}

export async function withExponentialBackoff<T>(
  action: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
  factor = 2,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      const backoffDelay = delayMs * Math.pow(factor, attempt);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}
