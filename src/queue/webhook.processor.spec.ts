import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookProcessor } from './webhook.processor';

describe('WebhookProcessor', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('marks the event as success when the outbound PUT request succeeds', async () => {
    const prisma = createPrismaMock();
    const processor = new WebhookProcessor(prisma as PrismaService);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });

    global.fetch = fetchMock as typeof fetch;
    prisma.webhookEvent.findUnique.mockResolvedValue(createStoredEvent());

    await processor.process(createJob());

    expect(fetchMock).toHaveBeenCalledWith(
      'https://webhook.site/337b6e9b-69ce-499e-b251-1801ceda57ff',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ foo: 'bar' }),
      }),
    );
    expect(prisma.webhookEvent.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'evt_1' },
      data: {
        status: 'processing',
        lastError: null,
        nextRetryAt: null,
      },
    });
    expect(prisma.webhookEvent.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'evt_1' },
      data: {
        status: 'success',
        retries: 0,
        lastError: null,
        nextRetryAt: null,
      },
    });
  });

  it('prefers the stored target URL override when present', async () => {
    const prisma = createPrismaMock();
    const processor = new WebhookProcessor(prisma as PrismaService);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });

    global.fetch = fetchMock as typeof fetch;
    prisma.webhookEvent.findUnique.mockResolvedValue(
      createStoredEvent({ targetUrl: 'http://127.0.0.1:65535/boom' }),
    );

    await processor.process(createJob());

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:65535/boom',
      expect.any(Object),
    );
  });

  it('marks the event as failed and schedules the next retry when delivery fails', async () => {
    const prisma = createPrismaMock();
    const processor = new WebhookProcessor(prisma as PrismaService);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server error'),
    });

    global.fetch = fetchMock as typeof fetch;
    prisma.webhookEvent.findUnique.mockResolvedValue(createStoredEvent());

    await expect(processor.process(createJob())).rejects.toThrow(
      'Webhook target responded with 500: server error',
    );

    expect(prisma.webhookEvent.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'evt_1' },
      data: expect.objectContaining({
        status: 'failed',
        retries: 1,
        lastError: 'Webhook target responded with 500: server error',
        nextRetryAt: expect.any(Date),
      }),
    });
  });
});

function createPrismaMock() {
  return {
    webhookEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createStoredEvent(overrides = {}) {
  return {
    id: 'evt_1',
    event: 'appointment.updated',
    appointmentId: 'apt_1',
    targetUrl: null,
    payload: { foo: 'bar' },
    status: 'pending',
    retries: 0,
    nextRetryAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createJob() {
  return {
    data: { id: 'evt_1' },
    attemptsMade: 0,
    opts: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  } as Job<{ id: string }>;
}
