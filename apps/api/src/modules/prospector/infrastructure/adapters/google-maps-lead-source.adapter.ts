import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ILeadSourceProvider, SourcedLead } from '../../application/ports/lead-source.port';

@Injectable()
export class GoogleMapsLeadSourceAdapter implements ILeadSourceProvider {
  private readonly logger = new Logger(GoogleMapsLeadSourceAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async searchCompanies(sector: string, region: string): Promise<SourcedLead[]> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      this.logger.error('GOOGLE_MAPS_API_KEY is missing');
      return [];
    }

    try {
      // 1. Text Search for companies
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: {
            query: `${sector} em ${region}`,
            key: apiKey,
          },
        },
      );

      const places = response.data.results || [];
      const sourcedLeads: SourcedLead[] = [];

      // 2. Fetch Details for each place (to get phone and website)
      for (const place of places.slice(0, 10)) { // Limit to 10 for performance/cost
        const detailsResponse = await axios.get(
          'https://maps.googleapis.com/maps/api/place/details/json',
          {
            params: {
              place_id: place.place_id,
              fields: 'name,formatted_phone_number,website,formatted_address',
              key: apiKey,
            },
          },
        );

        const details = detailsResponse.data.result;
        if (details) {
          sourcedLeads.push({
            name: details.name,
            address: details.formatted_address,
            phone: details.formatted_phone_number,
            website: details.website,
            placeId: place.place_id,
          });
        }
      }

      return sourcedLeads;
    } catch (error) {
      this.logger.error(`Google Maps Search Failed: ${error.message}`);
      return [];
    }
  }
}
