import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppInboundProcessor } from '../../../infrastructure/queue/whatsapp-inbound.processor';
import { HandleIncomingMessageUseCase } from '../../use-cases/handle-incoming-message.use-case';
import { TenantContextService } from '../../../../../common/utils/tenant-context/tenant-context.service';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

describe('WhatsAppInboundProcessor (Integration)', () => {
  let processor: WhatsAppInboundProcessor;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppInboundProcessor,
        {
          provide: HandleIncomingMessageUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            run: jest.fn((ctx, cb) => cb()),
          },
        },
      ],
    }).compile();

    processor = module.get<WhatsAppInboundProcessor>(WhatsAppInboundProcessor);
    
    // Spy on the application Logger prototype's error and warn methods
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log [DLQ-CRITICAL] when job fails permanently (attemptsMade >= maxAttempts)', async () => {
    const mockJob = {
      id: 'test-job-id',
      data: {
        leadId: 'lead-1',
        externalId: 'ext-1',
        phone: '551199999999',
        text: 'Hello',
        timestamp: new Date().toISOString(),
        organizationId: 'org-1',
        unitId: 'unit-1',
      },
      attemptsMade: 5,
      opts: {
        attempts: 5,
      },
    } as unknown as Job;

    const mockError = new Error('Database Timeout');

    await processor.onFailed(mockJob, mockError);

    expect(loggerErrorSpy).toHaveBeenCalled();
    const loggedMessage = loggerErrorSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('[DLQ-CRITICAL]');
    expect(loggedMessage).toContain('test-job-id');
    expect(loggedMessage).toContain('Database Timeout');
  });

  it('should log warning and NOT log [DLQ-CRITICAL] when job fails but has remaining retries (attemptsMade < maxAttempts)', async () => {
    const mockJob = {
      id: 'test-job-id-retry',
      data: {
        leadId: 'lead-1',
        externalId: 'ext-1',
        phone: '551199999999',
        text: 'Hello',
        timestamp: new Date().toISOString(),
        organizationId: 'org-1',
        unitId: 'unit-1',
      },
      attemptsMade: 2,
      opts: {
        attempts: 5,
      },
    } as unknown as Job;

    const mockError = new Error('Temporary Network Failure');

    await processor.onFailed(mockJob, mockError);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalled();
    const loggedMessage = loggerWarnSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('test-job-id-retry');
    expect(loggedMessage).toContain('failed on attempt 2/5');
    expect(loggedMessage).toContain('Temporary Network Failure');
  });
});
