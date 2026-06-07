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

    // 1. LIMPEZA DE PARÂMETROS: Remove vírgulas residuais e espaços extras
    const cleanSector = sector.trim();
    const cleanRegion = region ? region.trim() : '';
    
    // Constrói a query de forma limpa: "Setor em Regiao" ou apenas "Setor"
    const searchContext = cleanRegion 
      ? `${cleanSector} em ${cleanRegion}`
      : cleanSector;

    try {
      this.logger.log(`PRODUÇÃO: Consultando Serper.dev (Endpoint /maps) para: "${searchContext}"`);

      const response = await axios.post(
        'https://google.serper.dev/maps',
        {
          q: searchContext,
          gl: 'br', // Forçar resultados no Brasil
          hl: 'pt-br', // Idioma em Português
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
        this.logger.debug(`Resposta completa da API: ${JSON.stringify(data)}`);
        return []; // Interrompe o processo sem recursão para evitar loops
      }

      const results = data.maps;
      
      // Filtragem: Apenas locais com telefone e que batam minimamente com o setor (evita spam de outros ramos)
      const leads = results
        .filter((place: any) => {
          const hasPhone = !!place.phoneNumber;
          if (!hasPhone) {
            this.logger.debug(`Lead descartado (Sem telefone): ${place.title}`);
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

      this.logger.log(`Sucesso: ${leads.length} leads qualificados de ${results.length} encontrados.`);
      
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
    
    // Algumas APIs do Google retornam o 0 do DDD (ex: 086). Removemos para padronizar.
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Garante DDI 55 se tiver 10 ou 11 dígitos
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    
    return cleaned;
  }
}
