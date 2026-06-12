import { ProspectorLead } from '../../domain/entities/prospector-lead.entity';

export class LeadOutputDto {
  id: string;
  name: string;
  phone: string;
  status: string;
  score: number;
  scoreIA: number;
  industry?: string;
  sector?: string;
  lastInteractionAt: Date;
  createdAt: Date;
  appointments: any[];
  interactions: any[];
  suggestedMessages: any[];
  isPending: boolean;

  static fromPrisma(lead: any): LeadOutputDto {
    const interactions = (lead.interactions || []).map((i: any) => ({
      ...i,
      sender: i.type === 'INBOUND' ? 'LEAD' : 'SDR'
    }));
    const lastInteraction = interactions[0];
    const isPending = lastInteraction ? ProspectorLead.calculateIsPending(lastInteraction.sender) : false;

    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      status: lead.status,
      score: lead.score,
      scoreIA: lead.score,
      industry: lead.industry,
      sector: lead.industry,
      lastInteractionAt: lead.lastInteractionAt,
      createdAt: lead.createdAt,
      appointments: lead.appointments || [],
      interactions,
      suggestedMessages: lead.suggestedMessages || [],
      isPending,
    };
  }
}
