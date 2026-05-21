import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  // In a real E2EE scenario, the 'tenantSecret' would come from a Secure Vault (e.g., AWS KMS)
  // or be derived from a value only known to the tenant.
  
  encrypt(text: string, tenantSecret: string): string {
    return CryptoJS.AES.encrypt(text, tenantSecret).toString();
  }

  decrypt(encryptedText: string, tenantSecret: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, tenantSecret);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
