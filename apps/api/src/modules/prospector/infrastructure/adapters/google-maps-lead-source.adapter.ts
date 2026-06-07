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

    // A Serper.dev às vezes performa melhor com a query no formato "Setor, Região"
    const searchContext = `${sector}, ${region}`;

    try {
      this.logger.log(`PRODUÇÃO: Consultando Serper.dev (Endpoint /maps) para: "${searchContext}"`);

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

      // DEBUG PROFUNDO: Vamos ver exatamente o que o Google respondeu
      const data = response.data;
      
      if (!data.maps || data.maps.length === 0) {
        this.logger.warn(`Aviso: O Google Maps não retornou nenhum local para "${searchContext}".`);
        this.logger.debug(`Resposta completa da API: ${JSON.stringify(data)}`);
        
        // Tentativa de Fallback: Query simplificada
        if (searchContext.includes(',')) {
             this.logger.log('Tentando busca simplificada sem vírgula...');
             return this.findLeads(sector, ''); // Recursão controlada (cuidado) ou apenas log
        }
      }

      const results = data.maps || [];
      
      // Filtragem e Mapeamento
      const leads = results
        .filter((place: any) => {
          const hasPhone = !!place.phoneNumber;
          if (!hasPhone) {
            this.logger.debug(`Lead descartado por falta de telefone: ${place.title}`);
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

      this.logger.log(`Sucesso: ${leads.length} leads com telefone extraídos de ${results.length} locais encontrados.`);
      
      return leads.slice(0, 10);

    } catch (error: any) {
      if (error.response) {
        this.logger.error(`[Serper API Error] Status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`[Network/Config Error] ${error.message}`);
      }
      return [];
    }
  }

  private sanitizePhoneNumber(raw: string): string {
    if (!raw) return '';
    
    // Remove tudo que não é número
    let cleaned = raw.replace(/\D/g, '');
    
    // Tratamento de prefixos comuns do Brasil capturados pelo Google
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Se for um número de 10 ou 11 dígitos, assume que falta o DDI 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    
    return cleaned;
  }
}
