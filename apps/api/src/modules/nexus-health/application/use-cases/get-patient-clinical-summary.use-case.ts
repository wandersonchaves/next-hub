import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AIOrchestratorEngine } from '../../../../common/engines/ai-orchestrator.engine';

export interface PatientClinicalSummaryResponse {
  summary: string;
  recommendedNextSteps: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class GetPatientClinicalSummaryUseCase {
  private readonly logger = new Logger(GetPatientClinicalSummaryUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AIOrchestratorEngine,
  ) {}

  async execute(patientId: string): Promise<PatientClinicalSummaryResponse> {
    // 1. Fetch Patient Data and Appointment History
    const patient = await this.prisma.client.lead.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          include: { procedure: true },
          orderBy: { startTime: 'desc' }
        }
      }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (patient.appointments.length === 0) {
      return {
        summary: 'Paciente novo sem histórico de procedimentos realizados na clínica.',
        recommendedNextSteps: ['Realizar consulta de avaliação inicial', 'Preencher ficha de anamnese'],
        riskLevel: 'LOW'
      };
    }

    // 2. Prepare context for AI
    const historyContext = patient.appointments.map(app => {
      return `- ${app.startTime.toLocaleDateString()}: ${app.procedure?.name || 'Consulta'} (${app.status})`;
    }).join('\n');

    const aiContext = `
      Você é um assistente médico sênior especializado em estética e saúde.
      Analise o histórico do paciente "${patient.name}" e gere um resumo clínico executivo.
      O resumo deve ser focado em continuidade de tratamento e possíveis alertas.
    `;

    const aiMessage = `
      Histórico de Consultas/Procedimentos:
      ${historyContext}
      
      Gere um resumo e recomendações.
    `;

    // 3. Inference via Shared Engine
    const response = await this.aiOrchestrator.generate<PatientClinicalSummaryResponse>({
      context: aiContext,
      message: aiMessage,
      expectedFormat: `
        {
          "summary": "Resumo clínico curto e profissional",
          "recommendedNextSteps": ["passo 1", "passo 2"],
          "riskLevel": "LOW | MEDIUM | HIGH"
        }
      `
    });

    return {
      summary: response.extractedData?.summary || response.content,
      recommendedNextSteps: response.extractedData?.recommendedNextSteps || [],
      riskLevel: response.extractedData?.riskLevel || 'LOW'
    };
  }
}
