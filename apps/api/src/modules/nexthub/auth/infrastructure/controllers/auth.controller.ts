import { Controller, Post, Body } from '@nestjs/common';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import type { LoginDto } from '../../application/use-cases/login.use-case';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @ApiOperation({ summary: 'Realizar login nativo e gerar sessão no Redis' })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }
}
