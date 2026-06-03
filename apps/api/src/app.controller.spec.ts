import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AppController', () => {
  let appController: AppController;

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getQueueToken('data-archiver'), useValue: mockQueue },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toContain('NextHub API');
    });
  });
});
