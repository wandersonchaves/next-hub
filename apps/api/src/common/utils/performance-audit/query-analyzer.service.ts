import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@enterprise/database';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class QueryAnalyzerService implements OnModuleInit {
  private readonly logger = new Logger('QueryAnalyzer');
  private slowQueryThreshold = 500; 

  onModuleInit() {
    this.logger.log('Database Query Performance Audit initialized');
    
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const basePrisma = new PrismaClient({
      adapter
    }).$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const before = Date.now();
            const result = await query(args);
            const after = Date.now();
            const duration = after - before;

            if (duration > 500) {
              console.warn(`SLOW QUERY: ${model}.${operation} took ${duration}ms`);
            }

            return result;
          },
        },
      },
    });
  }
}
