import { Module, Global } from '@nestjs/common';
import { JwtTokenAdapter } from './infrastructure/adapters/jwt-token.adapter';
import { BcryptHashAdapter } from './infrastructure/adapters/bcrypt-hash.adapter';
import { RedisSessionCacheAdapter } from './infrastructure/adapters/redis-session-cache.adapter';
import { IHashServiceToken } from './application/ports/hash-service.port';
import { ITokenServiceToken } from './application/ports/token-service.port';
import { ISessionCacheToken } from './application/ports/session-cache.port';

@Global()
@Module({
  providers: [
    {
      provide: IHashServiceToken,
      useClass: BcryptHashAdapter,
    },
    {
      provide: ITokenServiceToken,
      useClass: JwtTokenAdapter,
    },
    {
      provide: ISessionCacheToken,
      useClass: RedisSessionCacheAdapter,
    },
  ],
  exports: [
    IHashServiceToken,
    ITokenServiceToken,
    ISessionCacheToken,
  ],
})
export class AuthModule {}
