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

    // CORREÇÃO: No corpo de um POST JSON, não devemos usar encodeURIComponent.
    // O axios/JSON.stringify já trata a serialização. O Google Maps espera espaços normais.
    const searchContext = `${sector} em ${region}`;

    try {
      this.logger.log(`PRODUÇÃO: Iniciando busca REAL no Google Maps via Serper.dev para: "${searchContext}"`);

      const response = await axios.post(
        'https://google.serper.dev/maps',
        {
          q: searchContext,
          gl: 'br', // Forçar resultados no Brasil
          hl: 'pt-br', // Idioma em Português
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );

      // Log para Debug de Resposta Vazia
      if (!response.data.maps || response.data.maps.length === 0) {
        this.logger.warn(`Serper.dev retornou status 200 mas com 0 resultados para: "${searchContext}"`);
        this.logger.debug(`Raw Payload recebido: ${JSON.stringify(response.data)}`);
      }

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

      this.logger.log(`Busca concluída. ${realLeads.length} leads com telefone encontrados.`);
      return realLeads.slice(0, 10);

    } catch (error: any) {
      if (error.response) {
        this.logger.error(`[Serper API Error] ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`[Infrastructure Error] ${error.message}`);
      }
      return [];
    }
  }

  private sanitizePhoneNumber(raw: string): string {
    // Remove tudo que não é número
    let cleaned = raw.replace(/\D/g, '');
    
    // Se começar com 0, remove o zero (comum em DDDs capturados pelo Google)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Se for um número brasileiro sem DDI (10 ou 11 dígitos), adiciona 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    
    return cleaned;
  }
}
