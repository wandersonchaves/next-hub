import { Injectable, Logger } from '@nestjs/common';
import { ILeadSourceProvider, ScrapedLead } from '../../application/ports/lead-source.port';

@Injectable()
export class MockLeadSourceAdapter implements ILeadSourceProvider {
  private readonly logger = new Logger(MockLeadSourceAdapter.name);

  async findLeads(sector: string, region: string): Promise<ScrapedLead[]> {
    this.logger.log(`MODO DESENVOLVIMENTO: Gerando leads fictícios para ${sector} em ${region}`);

    // Simula latência de rede
    await new Promise(resolve => setTimeout(resolve, 1000));

    return [
      {
        name: `Clínica ${sector} Exemplo`,
        phone: '5586994037788',
        address: 'Rua dos Testes, 123 - Centro',
        rating: 4.8,
        website: 'https://exemplo.com'
      },
      {
        name: `${sector} Premium`,
        phone: '5586994037789',
        address: 'Av. Simulação, 456 - Bairro',
        rating: 4.5
      }
    ];
  }
}
