import { Injectable } from '@nestjs/common';

@Injectable()
export class SDRConfigEngine {
  getNicheContext(industry?: string | null): string {
    const defaultContext = 'Foco em eficiência operacional, gestão de filiais e automação de processos.';
    
    const contexts: Record<string, string> = {
      'ESTETICA': 'Dor: Salas vazias por no-show e perda de pacientes (LTV baixo). Foco: Automação de confirmações e retenção inteligente de pacientes recorrentes.',
      'PET': 'Dor: Ociosidade na equipe de banho e falta de controle sobre retornos. Foco: Gestão de agenda e lembretes automáticos para tutores.',
      'ODONTO': 'Dor: Pacientes que não voltam para manutenção preventiva. Foco: Centralização de controle e régua de relacionamento automática.',
    };

    if (!industry) return defaultContext;
    
    const normalized = industry.toUpperCase();
    return contexts[normalized] || defaultContext;
  }

  getPlansContext(): string {
    return `
      PLATAFORMA SAAS DE GESTÃO E AUTOMAÇÃO:
      - Starter: R$ 299/mês (Gestão de agenda + Automação básica)
      - Business: R$ 599/mês (Retenção inteligente + IA Copilot + Multi-unidades)
      - Enterprise: Sob consulta (Customizações + API ilimitada)
    `;
  }
}
