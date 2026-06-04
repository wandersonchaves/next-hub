import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { ITokenService, TokenPayload } from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenAdapter implements ITokenService {
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'super-secret-fallback-do-not-use-in-prod');
  }

  generateToken(payload: TokenPayload, expiresIn: string = '7d'): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: expiresIn as any });
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
