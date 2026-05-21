import { Controller, Post, Body, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import type { Response } from 'express';
import { ClerkGuard } from '../common/guards/clerk.guard';
import { MembershipGuard } from '../common/guards/membership.guard';
import { CurrentOrg } from '../common/decorators/org.decorator';
import type { Organization } from '@enterprise/database';

@Controller('ai')
@UseGuards(ClerkGuard, MembershipGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  async chat(
    @Body('messages') messages: any[],
    @CurrentOrg() org: Organization,
    @Res() res: Response,
  ) {
    if (!messages || messages.length === 0) {
      throw new BadRequestException('Messages are required');
    }

    const result = await this.aiService.generateChatResponse(messages, org.id);
    
    // Convert to a stream and pipe to the response
    result.pipeTextStreamToResponse(res);
  }
}
