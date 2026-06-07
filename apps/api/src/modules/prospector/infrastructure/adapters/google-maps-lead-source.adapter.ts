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

    const searchContext = `${sector} ${region}`.trim();

    try {
      this.logger.log(`PRODUÇÃO: Consultando Serper.dev para: "${searchContext}"`);

      const response = await axios.post(
        'https://google.serper.dev/maps',
        {
          q: searchContext,
          gl: 'br',    
          hl: 'pt-br'
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
      
      // AJUSTE DE CONTRATO: A Serper retorna 'places' em vez de 'maps'
      const results = data.places || data.maps || [];

      if (results.length === 0) {
        this.logger.warn(`Zero resultados encontrados para: "${searchContext}".`);
        return [];
      }

      const validLeads = results
        .filter((place: any) => !!place.phoneNumber)
        .map((place: any) => ({
          name: place.title,
          phone: this.sanitizePhoneNumber(place.phoneNumber),
          address: place.address,
          rating: place.rating,
          website: place.website,
        }));

      this.logger.log(`Sucesso: ${validLeads.length} leads reais extraídos de ${results.length} locais encontrados.`);
      
      return validLeads.slice(0, 10);

    } catch (error: any) {
      const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Falha na integração Serper: ${errorMsg}`);
      return [];
    }
  }

  private sanitizePhoneNumber(raw: string): string {
    if (!raw) return '';
    
    // O Serper retorna "+55 86 3011-6646"
    let cleaned = raw.replace(/\D/g, ''); // "558630116646"
    
    // Tratamento de prefixos nacionais
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Se já tiver 12 ou 13 dígitos e começar com 55, está perfeito
    if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
       return cleaned;
    }

    // Se tiver 10 ou 11 dígitos, adiciona o DDI 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    
    return cleaned;
  }
}
