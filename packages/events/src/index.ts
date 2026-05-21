import { Queue, Worker, Job } from 'bullmq';

export interface BaseEvent {
  id: string;
  organizationId: string;
  timestamp: Date;
  type: string;
  payload: any;
}

export type EventCallback = (event: BaseEvent) => Promise<void>;

export class EventMesh {
  private queue: Queue;
  private redisOptions: { host: string; port: number };

  constructor(redisOptions: { host: string; port: number }) {
    this.redisOptions = redisOptions;
    this.queue = new Queue('event-mesh', { connection: redisOptions });
  }

  async publish(event: Omit<BaseEvent, 'id' | 'timestamp'>) {
    const fullEvent: BaseEvent = {
      ...event,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
    };

    return await this.queue.add(event.type, fullEvent, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  subscribe(eventType: string, callback: EventCallback) {
    new Worker(
      'event-mesh',
      async (job: Job<BaseEvent>) => {
        if (job.name === eventType) {
          await callback(job.data);
        }
      },
      { connection: this.redisOptions }
    );
  }
}
