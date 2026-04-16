import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CmWebhookService } from './cm_webhook.service';

describe('CmWebhookService', () => {
  let service: CmWebhookService;

  const prismaService = {
    webhookEvent: {
      create: jest.fn(),
    },
  };

  const webhookQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmWebhookService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: getQueueToken('webhook'),
          useValue: webhookQueue,
        },
      ],
    }).compile();

    service = module.get<CmWebhookService>(CmWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores a per-event target URL override when provided', async () => {
    prismaService.webhookEvent.create.mockResolvedValue({
      id: 'evt_1',
      event: 'appointment.updated',
      appointmentId: 'apt_1',
      targetUrl: 'http://127.0.0.1:65535/boom',
      payload: { foo: 'bar' },
      status: 'pending',
    });

    await service.processIncoming({ event: 'appointment.updated', appointmentId: 'apt_1' }, 'http://127.0.0.1:65535/boom');

    expect(prismaService.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetUrl: 'http://127.0.0.1:65535/boom',
      }),
    });
  });
});
