import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { ITokenService, TokenPayload } from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenAdapter implements ITokenService {
  constructor(private readonly configService: ConfigService) {}

  private get secret(): string {
    return this.configService.get<string>('JWT_SECRET', 'super-secret-fallback-do-not-use-in-prod');
  }

  generateToken(payload: TokenPayload, expiresIn: string = '7d'): string {
    return jwt.sign(payload, this.secret, { expiresIn: expiresIn as any });
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      // Log the error internally for debugging if needed
      return null;
    }
  }
}
