import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IContactFinder } from '../../application/ports/lead-source.port';

@Injectable()
export class WebSearchContactFinderAdapter implements IContactFinder {
  private readonly logger = new Logger(WebSearchContactFinderAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async findMissingPhone(companyName: string, website?: string): Promise<string | null> {
    const serperKey = this.configService.get<string>('SERPER_API_KEY');
    
    if (!serperKey) {
      this.logger.warn('SERPER_API_KEY is missing, skipping web search enrichment');
      return null;
    }

    try {
      // 1. Search for contact info on Google via Serper
      const query = website ? `site:${website} "whatsapp" OR "contato" OR "telefone"` : `${companyName} whatsapp contato`;
      
      const response = await axios.post(
        'https://google.serper.dev/search',
        { q: query },
        {
          headers: {
            'X-API-KEY': serperKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const snippets = response.data.organic?.map((r: any) => r.snippet).join(' ') || '';
      
      // 2. Extract Phone Number using Regex
      const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}/g;
      const matches = snippets.match(phoneRegex);

      if (matches && matches.length > 0) {
        // Return the first match, cleaned
        const found = matches[0];
        this.logger.debug(`Found potential phone for ${companyName}: ${found}`);
        return found;
      }

      return null;
    } catch (error) {
      this.logger.error(`Web Search enrichment failed: ${error.message}`);
      return null;
    }
  }
}
