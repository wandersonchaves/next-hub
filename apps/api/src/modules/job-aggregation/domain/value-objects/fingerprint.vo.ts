import { createHash } from 'crypto';

export class Fingerprint {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('Fingerprint value cannot be empty');
    }
  }

  static create(value: string): Fingerprint {
    return new Fingerprint(value);
  }

  static generate(title: string, company: string, description: string): Fingerprint {
    const rawString = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}|${description.toLowerCase().trim()}`;
    const hash = createHash('sha256').update(rawString).digest('hex');
    return new Fingerprint(hash);
  }

  equals(other: Fingerprint): boolean {
    return this.value === other.value;
  }
}
