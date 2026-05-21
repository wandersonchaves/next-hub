import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma, ExtendedPrismaClient, PrismaClient } from '@enterprise/database';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private _prisma: ExtendedPrismaClient;
  private _readReplica?: PrismaClient;

  constructor() {
    this._prisma = prisma;
    
    // In production, we initialize a separate read-only client for replicas
    if (process.env.DATABASE_URL_READ_REPLICA) {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_READ_REPLICA });
      const adapter = new PrismaPg(pool);
      this._readReplica = new PrismaClient({
        adapter,
      });
    }
  }

  // Use the primary client (with the multi-tenancy extension)
  get client() {
    return this._prisma;
  }

  // Use the read-only replica when needed
  get readReplica() {
    return this._readReplica || this._prisma;
  }

  async onModuleInit() {
    await this._prisma.$connect();
    if (this._readReplica) {
      await this._readReplica.$connect();
    }
  }

  async onModuleDestroy() {
    await this._prisma.$disconnect();
    if (this._readReplica) {
      await this._readReplica.$disconnect();
    }
  }
}
