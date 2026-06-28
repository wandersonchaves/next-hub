import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega o arquivo .env da raiz da app
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockResolvedValue(true),
      getName: jest.fn().mockReturnValue('mock-queue'),
      getRepeatableJobs: jest.fn().mockResolvedValue([]),
      removeRepeatableByKey: jest.fn().mockResolvedValue(true),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockResolvedValue(true),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

jest.mock('@bull-board/api/bullMQAdapter', () => {
  return {
    BullMQAdapter: jest.fn().mockImplementation(() => ({
      setQueue: jest.fn(),
      getQueue: jest.fn(),
      getName: jest.fn().mockReturnValue('mock-queue'),
    })),
  };
});
