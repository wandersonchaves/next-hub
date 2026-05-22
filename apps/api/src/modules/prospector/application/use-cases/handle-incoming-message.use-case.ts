import { Injectable, Inject } from '@nestjs/common';
import type { ILeadRepository, IAppointmentRepository, IAIService } from '../ports/prospector.ports';
import { Lead, Appointment } from '../../domain/entities/prospector.entities';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HandleIncomingMessageUseCase {
  constructor(
    @Inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    @Inject('IAppointmentRepository') private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IAIService') private readonly aiService: IAIService,
  ) { }

  async execute(data: {
    message: string;
    phone: string;
    organizationId: string;
    branchId: string;
    nicheContext: string;
    plansContext: string;
  }) {
    // 1. Analisar com IA
    const analysis = await this.aiService.analyzeMessage(data.message, {
      nicheContext: data.nicheContext,
      plansContext: data.plansContext,
    });

    // 2. Buscar ou criar Lead
    let lead = await this.leadRepository.findByPhone(data.phone, data.organizationId);

    if (!lead) {
      lead = new Lead(
        uuidv4(),
        analysis.name || 'Unknown',
        data.phone,
        data.organizationId,
        data.branchId,
        analysis.email,
      );
      await this.leadRepository.save(lead);
    } else {
      // Atualizar lead existente se necessário
      const updatedLead = new Lead(
        lead.id,
        analysis.name || lead.name,
        lead.phone,
        lead.organizationId,
        lead.branchId,
        analysis.email || lead.email,
        lead.status,
        lead.score + 10,
        lead.industry,
        new Date()
      );
      await this.leadRepository.update(updatedLead);
      lead = updatedLead;
    }

    // 3. Se houver intenção de agendamento, criar Appointment
    if (analysis.intent === 'SCHEDULE' && analysis.appointmentDate) {
      const startTime = analysis.appointmentDate;
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora de duração padrão

      const appointment = new Appointment(
        uuidv4(),
        `Reunião com ${lead.name}`,
        startTime,
        endTime,
        lead.id,
        data.branchId,
        data.organizationId,
      );

      await this.appointmentRepository.save(appointment);
      return { lead, appointment, status: 'SCHEDULED' };
    }

    return { lead, status: 'PROCESSED' };
  }
}
