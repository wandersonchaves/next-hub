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

    // 1. ESTRATÉGIA DE BUSCA EM DUAS ETAPAS
    // Tentativa 1: Query específica "Setor Região"
    const primaryQuery = `${sector} ${region}`.trim();
    let leads = await this.executeSerperQuery(primaryQuery, apiKey);

    // Tentativa 2: Fallback se a primeira falhar (Query mais abrangente)
    if (leads.length === 0 && region) {
      this.logger.log(`Tentativa 2: Refinando busca para "${sector}" em "${region}" com formato alternativo...`);
      const fallbackQuery = `${sector} em ${region}, Brasil`;
      leads = await this.executeSerperQuery(fallbackQuery, apiKey);
    }

    return leads.slice(0, 10);
  }

  private async executeSerperQuery(query: string, apiKey: string): Promise<ScrapedLead[]> {
    try {
      this.logger.log(`Consultando Serper (Maps): "${query}"`);

      const response = await axios.post(
        'https://google.serper.dev/maps',
        {
          q: query,
          // Removendo GL/HL temporariamente para testar se a restrição geográfica está bloqueando resultados
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

      // LOG DE DIAGNÓSTICO PROFUNDO: Visível na Railway
      if (!data.maps || data.maps.length === 0) {
        this.logger.warn(`Google retornou 0 locais para: "${query}".`);
        this.logger.debug(`Resposta completa da Serper: ${JSON.stringify(data)}`);
        return [];
      }

      const results = data.maps;
      
      const scrapedLeads = results
        .filter((place: any) => !!place.phoneNumber)
        .map((place: any) => ({
          name: place.title,
          phone: this.sanitizePhoneNumber(place.phoneNumber),
          address: place.address,
          rating: place.rating,
          website: place.website,
        }));

      this.logger.log(`Sucesso: ${scrapedLeads.length} leads qualificados de ${results.length} encontrados.`);
      return scrapedLeads;

    } catch (error: any) {
      const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Falha na Query "${query}": ${errorMsg}`);
      return [];
    }
  }

  private sanitizePhoneNumber(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.replace(/\D/g, '');
    
    // Tratamento para números brasileiros
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    
    return cleaned;
  }
}
