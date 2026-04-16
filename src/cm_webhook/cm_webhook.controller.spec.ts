import { Test, TestingModule } from '@nestjs/testing';
import { CmWebhookController } from './cm_webhook.controller';
import { CmWebhookService } from './cm_webhook.service';

describe('CmWebhookController', () => {
  let controller: CmWebhookController;

  const cmWebhookService = {
    processIncoming: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CmWebhookController],
      providers: [
        {
          provide: CmWebhookService,
          useValue: cmWebhookService,
        },
      ],
    }).compile();

    controller = module.get<CmWebhookController>(CmWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
