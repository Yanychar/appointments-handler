import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { WebhookEvent } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_WEBHOOK_TARGET_URL =
  'https://webhook.site/337b6e9b-69ce-499e-b251-1801ceda57ff';
const DEFAULT_BACKOFF_DELAY_MS = 2000;
const MAX_ERROR_LENGTH = 500;

type WebhookJobData = {
  id: string;
};

@Injectable()
@Processor('webhook')
export class WebhookProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<WebhookJobData>) {
    const eventId = job.data?.id;

    if (!eventId) {
      throw new Error('Missing webhook event id in job payload');
    }

    const storedEvent = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!storedEvent) {
      throw new Error(`Webhook event ${eventId} not found`);
    }

    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'processing',
        lastError: null,
        nextRetryAt: null,
      },
    });

    try {
      const response = await fetch(this.getTargetUrl(storedEvent), {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(storedEvent.payload),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        const responsePreview = responseBody.slice(0, MAX_ERROR_LENGTH);
        throw new Error(
          `Webhook target responded with ${response.status}${responsePreview ? `: ${responsePreview}` : ''}`,
        );
      }

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'success',
          retries: job.attemptsMade,
          lastError: null,
          nextRetryAt: null,
        },
      });

      return true;
    } catch (error) {
      const failedAttempts = job.attemptsMade + 1;

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'failed',
          retries: failedAttempts,
          lastError: this.toErrorMessage(error),
          nextRetryAt: this.getNextRetryAt(job, failedAttempts),
        },
      });

      throw error;
    }
  }

  private getTargetUrl(storedEvent: Pick<WebhookEvent, 'targetUrl'>) {
    return storedEvent.targetUrl || process.env.WEBHOOK_TARGET_URL || DEFAULT_WEBHOOK_TARGET_URL;
  }

  private getNextRetryAt(job: Job<WebhookJobData>, failedAttempts: number) {
    const totalAttempts = job.opts.attempts ?? 1;

    if (failedAttempts >= totalAttempts) {
      return null;
    }

    const retryDelayMs = this.getRetryDelayMs(job, failedAttempts);
    return new Date(Date.now() + retryDelayMs);
  }

  private getRetryDelayMs(job: Job<WebhookJobData>, failedAttempts: number) {
    const backoff = job.opts.backoff;

    if (typeof backoff === 'number') {
      return backoff;
    }

    if (backoff && typeof backoff === 'object') {
      const baseDelay =
        typeof backoff.delay === 'number' ? backoff.delay : DEFAULT_BACKOFF_DELAY_MS;

      if (backoff.type === 'exponential') {
        return baseDelay * 2 ** (failedAttempts - 1);
      }

      return baseDelay;
    }

    return DEFAULT_BACKOFF_DELAY_MS;
  }

  private toErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message.slice(0, MAX_ERROR_LENGTH);
    }

    return 'Unknown webhook delivery error';
  }
}
