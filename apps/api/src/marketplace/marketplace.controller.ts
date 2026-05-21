import { Controller, Get, Post, Body, Headers, Param, Patch } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @Get('extensions')
  async list() {
    return this.marketplaceService.listExtensions();
  }

  @Post('extensions/:id/install')
  async install(
    @Param('id') extensionId: string,
    @Headers('organization-id') organizationId: string,
  ) {
    return this.marketplaceService.installExtension(extensionId, organizationId);
  }

  @Patch('extensions/:id/config')
  async updateConfig(
    @Param('id') extensionId: string,
    @Headers('organization-id') organizationId: string,
    @Body() config: any,
  ) {
    return this.marketplaceService.updateConfig(extensionId, organizationId, config);
  }
}
