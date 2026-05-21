import { Injectable } from '@nestjs/common';
import { IStorageProvider } from '../../interfaces/storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalStorageAdapter implements IStorageProvider {
  private storagePath = path.join(process.cwd(), 'local-storage');

  async upload(key: string, body: Buffer): Promise<string> {
    const filePath = path.join(this.storagePath, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    return `file://${filePath}`;
  }

  async download(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.storagePath, key));
  }
}
