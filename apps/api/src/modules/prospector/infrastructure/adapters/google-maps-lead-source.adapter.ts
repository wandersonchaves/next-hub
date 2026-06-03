import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ILeadSourceProvider, ScrapedLead } from '../../application/ports/lead-source.port';

@Injectable()
export class GoogleMapsLeadSourceAdapter implements ILeadSourceProvider {
  private readonly logger = new Logger(GoogleMapsLeadSourceAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async findLeads(sector: string, region: string): Promise<ScrapedLead[]> {
    const apiKey = this.configService.get<string>('SERPER_API_KEY');
    
    if (!apiKey) {
      this.logger.error('SERPER_API_KEY is missing. Real lead sourcing will fail.');
      return [];
    }

    try {
      this.logger.log(`PRODUÇÃO: Iniciando busca REAL no Google Maps para: ${sector} em ${region}`);

      const response = await axios.post(
        'https://google.serper.dev/maps',
        {
          q: `${sector} em ${region}`,
          gl: 'br',
          hl: 'pt-br',
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const results = response.data.maps || [];
      
      const realLeads = results
        .filter((place: any) => place.phoneNumber)
        .map((place: any) => ({
          name: place.title,
          phone: this.sanitizePhoneNumber(place.phoneNumber),
          address: place.address,
          rating: place.rating,
          website: place.website,
        }));

      this.logger.log(`Busca concluída. ${realLeads.length} leads reais encontrados.`);
      return realLeads.slice(0, 10);

    } catch (error) {
      this.logger.error(`Falha na busca real: ${error.message}`);
      return [];
    }
  }

  private sanitizePhoneNumber(raw: string): string {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    return cleaned;
  }
}
