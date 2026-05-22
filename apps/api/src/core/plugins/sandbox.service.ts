import { Injectable, Logger } from '@nestjs/common';
import * as vm from 'node:vm';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  async execute(code: string, context: Record<string, any>): Promise<any> {
    const sandbox = {
      ...context,
      console: {
        log: (...args: any[]) => this.logger.log(`[Plugin Log]: ${args.join(' ')}`),
        error: (...args: any[]) => this.logger.error(`[Plugin Error]: ${args.join(' ')}`),
      },
      // Restricted built-ins can be added here
      setTimeout,
      Buffer,
    };

    const script = new vm.Script(code);
    const vmContext = vm.createContext(sandbox);

    try {
      // Execute with timeout and limited access
      return script.runInContext(vmContext, { timeout: 1000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sandbox execution failed: ${message}`);
      throw error;
    }
  }
}
