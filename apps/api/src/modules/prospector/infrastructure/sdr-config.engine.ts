import { Injectable } from '@nestjs/common';

@Injectable()
export class SDRConfigEngine {
  getNicheContext(industry?: string | null): string {
    const defaultContext = 'Foco em eficiência operacional e ROI.';
    
    const contexts: Record<string, string> = {
      'ESTETICA': 'Dor: Salas vazias e furos na agenda (no-show). Foco: Recuperação de LTV e agendamento automático.',
      'PET': 'Dor: Equipe de banho ociosa e perda de recorrência. Foco: Bem-estar do pet e conveniência do tutor.',
      'ODONTO': 'Dor: Pacientes que não voltam para manutenção. Foco: Prevenção e saúde bucal contínua.',
    };

    if (!industry) return defaultContext;
    
    const normalized = industry.toUpperCase();
    return contexts[normalized] || defaultContext;
  }

  getPlansContext(): string {
    return `
      PLANOS DISPONÍVEIS:
      - Básico: R$ 299/mês (Até 500 leads)
      - Pro: R$ 599/mês (Leads ilimitados + IA Avançada)
      - Enterprise: Sob consulta (Multi-unidades)
    `;
  }
}
