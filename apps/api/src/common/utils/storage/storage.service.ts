import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private client: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
  }

  async uploadFile(key: string, file: Buffer, contentType: string) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      });
      await this.client.send(command);
      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`File upload failed: ${message}`);
      throw error;
    }
  }

  async getPresignedUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }
}
