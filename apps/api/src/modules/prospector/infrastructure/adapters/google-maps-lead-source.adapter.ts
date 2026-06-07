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

    // 1. QUERY OPTIMIZATION: "Setor Região" (Padrão nativo do Google Maps)
    // Removendo o "em" e a vírgula para dar máxima liberdade ao algoritmo do Google
    const cleanSector = sector.trim();
    const cleanRegion = region ? region.trim() : '';
    const searchContext = `${cleanSector} ${cleanRegion}`.trim();

    try {
      this.logger.log(`PRODUÇÃO: Consultando Serper.dev para: "${searchContext}"`);

      const response = await axios.post(
        'https://google.serper.dev/maps',
        {
          q: searchContext,
          gl: 'br', 
          hl: 'pt-br',
          autocorrect: true
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );

      const data = response.data;
      
      if (!data.maps || data.maps.length === 0) {
        this.logger.warn(`Zero resultados para: "${searchContext}".`);
        this.logger.debug(`Estrutura da Resposta: ${JSON.stringify(data)}`);
        return []; 
      }

      const results = data.maps;
      
      // Mapeamento com saneamento rigoroso
      const leads = results
        .filter((place: any) => {
          const hasPhone = !!place.phoneNumber;
          if (!hasPhone) {
            this.logger.debug(`Ignorado (Sem Telefone): ${place.title}`);
          }
          return hasPhone;
        })
        .map((place: any) => ({
          name: place.title,
          phone: this.sanitizePhoneNumber(place.phoneNumber),
          address: place.address,
          rating: place.rating,
          website: place.website,
        }));

      this.logger.log(`Sucesso: ${leads.length} leads qualificados encontrados para "${searchContext}".`);
      
      return leads.slice(0, 10);

    } catch (error: any) {
      if (error.response) {
        this.logger.error(`[Serper API Error] Status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`[Infrastructure Error] ${error.message}`);
      }
      return [];
    }
  }

  private sanitizePhoneNumber(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.replace(/\D/g, '');
    
    // Padronização para Brasil (DDI 55)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    
    return cleaned;
  }
}
