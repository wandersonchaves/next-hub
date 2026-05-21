import { Injectable } from '@nestjs/common';
import { IStorageProvider } from '../../interfaces/storage.interface';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3StorageAdapter implements IStorageProvider {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({ region: 'us-east-1' });
  }

  async upload(key: string, body: Buffer): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: body,
    }));
    return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }));
    
    if (!response.Body) {
      throw new Error('File body is empty');
    }

    return Buffer.from(await response.Body.transformToByteArray());
  }
}
