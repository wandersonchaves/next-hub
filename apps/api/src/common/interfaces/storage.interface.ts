export interface IStorageProvider {
  upload(key: string, body: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
