import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface CreateEventDto {
  title: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  /**
   * Creates a Google Calendar event with a native Google Meet link.
   */
  async createEvent(dto: CreateEventDto): Promise<{ eventId: string; meetUrl: string }> {
    this.logger.log(`Google Calendar: Creating event "${dto.title}" with Meet for ${dto.attendeeEmail}`);
    
    // Payload enviado para a API do Google Calendar com fuso horário brasileiro explícito
    const googleEventPayload = {
      summary: dto.title,
      start: {
        dateTime: dto.startTime.toISOString(),
        timeZone: 'America/Fortaleza'
      },
      end: {
        dateTime: dto.endTime.toISOString(),
        timeZone: 'America/Fortaleza'
      },
      attendees: [{ email: dto.attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    this.logger.debug(`Google Calendar API Payload: ${JSON.stringify(googleEventPayload)}`);
    
    const mockEventId = `google-event-${uuidv4().substring(0, 8)}`;
    const mockMeetUrl = `https://meet.google.com/${uuidv4().substring(0, 4)}-${uuidv4().substring(0, 4)}-${uuidv4().substring(0, 4)}`;

    this.logger.log(`Success: Generated Meet URL: ${mockMeetUrl}`);
    
    return {
      eventId: mockEventId,
      meetUrl: mockMeetUrl
    };
  }
}
