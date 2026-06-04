export interface TokenPayload {
  sub: string; // userId
  email: string;
  [key: string]: any;
}

export interface ITokenService {
  generateToken(payload: TokenPayload, expiresIn?: string): string;
  verifyToken(token: string): Promise<TokenPayload | null>;
}

export const ITokenServiceToken = Symbol('ITokenService');
