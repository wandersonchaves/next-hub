import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Processor('backups')
export class BackupProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupProcessor.name);
  private s3Client: S3Client;

  constructor() {
    super();
    this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'daily-db-backup') {
      this.logger.log('Starting daily database backup...');
      
      const fileName = `backup-${new Date().toISOString()}.sql`;
      const filePath = `/tmp/${fileName}`;

      try {
        // Run pg_dump
        await execAsync(`pg_dump ${process.env.DATABASE_URL} > ${filePath}`);

        // Upload to S3
        const bucketName = process.env.BACKUP_BUCKET_NAME;
        
        if (!bucketName) {
          this.logger.warn('BACKUP_BUCKET_NAME is not configured. Skipping S3 upload.');
          if (process.env.NODE_ENV === 'development') {
            this.logger.log(`In development, backup file is available at: ${filePath}`);
          }
          return;
        }

        // Note: This assumes AWS credentials are set in environment
        await this.s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: require('fs').createReadStream(filePath),
        }));

        this.logger.log('Database backup successfully uploaded to S3.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Database backup failed: ${message}`);
        throw error;
      }
    }
  }
}
