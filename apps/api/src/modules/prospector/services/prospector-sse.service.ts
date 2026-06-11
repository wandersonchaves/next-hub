import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface LeadUpdateEvent {
  leadId: string;
  status: string;
  scoreIA: number;
}

@Injectable()
export class ProspectorSseService {
  private readonly logger = new Logger(ProspectorSseService.name);
  private readonly update$ = new Subject<{ data: LeadUpdateEvent }>();

  getUpdates(): Observable<{ data: LeadUpdateEvent }> {
    return this.update$.asObservable();
  }

  broadcast(event: LeadUpdateEvent) {
    this.logger.log(`Broadcasting lead update SSE: ${JSON.stringify(event)}`);
    this.update$.next({ data: event });
  }
}
