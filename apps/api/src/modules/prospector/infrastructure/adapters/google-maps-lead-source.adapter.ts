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

    // 1. SANITIZAÇÃO DE ENCODING: Garantir que caracteres especiais não quebrem a query
    const encodedSector = encodeURIComponent(sector);
    const encodedRegion = encodeURIComponent(region);
    const searchContext = `${encodedSector} em ${encodedRegion}`;

    try {
      this.logger.log(`PRODUÇÃO: Iniciando busca REAL no Google Maps via Serper.dev para: ${sector} (${encodedSector}) em ${region} (${encodedRegion})`);

      const response = await axios.post(
        'https://google.serper.dev/maps',
        {
          q: searchContext,
          gl: 'br',
          hl: 'pt-br',
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 20000, // Aumentado para 20s devido à latência de rede/scraping
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

      this.logger.log(`Busca concluída. ${realLeads.length} leads reais processados com sucesso.`);
      return realLeads.slice(0, 10);

    } catch (error: any) {
      // 2. TELEMETRIA VERBOSA: Diagnóstico profundo de falhas de infraestrutura/faturamento
      if (error.response) {
        const status = error.response.status;
        const data = JSON.stringify(error.response.data);

        this.logger.error(`[Google Cloud / Serper Error] Falha crítica na requisição HTTP.`);
        this.logger.error(`Status Code: ${status}`);
        this.logger.error(`Response Data: ${data}`);

        if (status === 403) {
          this.logger.error('Dica: Verifique se o faturamento (billing) está ativo ou se a API key tem permissão para o endpoint /maps.');
        }
      } else if (error.request) {
        this.logger.error('[Infrastructure Error] O request foi enviado mas nenhuma resposta foi recebida do Google/Serper.');
      } else {
        this.logger.error(`[Unexpected Error] ${error.message}`);
      }
      
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
