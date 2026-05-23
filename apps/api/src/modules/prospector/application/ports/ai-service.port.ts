export interface AIResponse {
  content: string;
  email?: string;
  appointmentDate?: Date;
  intent: 'GREETING' | 'BOOKING' | 'QUESTION' | 'NEGATIVE' | 'OTHER';
}

export interface IAIService {
  generateResponse(message: string, context: string): Promise<AIResponse>;
}
