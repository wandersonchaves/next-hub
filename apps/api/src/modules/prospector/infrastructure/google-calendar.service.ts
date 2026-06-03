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
    
    // In a production environment, this would call the Google Calendar API with:
    // conferenceData: { createRequest: { requestId: uuidv4() } }
    
    const mockEventId = `google-event-${uuidv4().substring(0, 8)}`;
    const mockMeetUrl = `https://meet.google.com/${uuidv4().substring(0, 4)}-${uuidv4().substring(0, 4)}-${uuidv4().substring(0, 4)}`;

    this.logger.log(`Success: Generated Meet URL: ${mockMeetUrl}`);
    
    return {
      eventId: mockEventId,
      meetUrl: mockMeetUrl
    };
  }
}
