export interface IHashService {
  hash(data: string): Promise<string>;
  compare(data: string, encrypted: string): Promise<boolean>;
}

export const IHashServiceToken = Symbol('IHashService');
