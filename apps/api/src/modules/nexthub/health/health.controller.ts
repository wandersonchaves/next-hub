import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and Database health' })
  async check() {
    try {
      // Verifica se o banco de dados responde
      await this.prisma.client.$queryRaw`SELECT 1`;
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
          api: 'healthy'
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: message
      };
    }
  }
}
