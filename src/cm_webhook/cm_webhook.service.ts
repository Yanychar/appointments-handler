import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma, WebhookEvent } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('webhook') private readonly webhookQueue: Queue,
  ) {}

  async processIncoming(payload: Record<string, unknown>, targetUrl?: string) {
    const event = typeof payload.event === 'string' ? payload.event : 'unknown';
    const appointmentId =
      typeof payload.appointmentId === 'string' ? payload.appointmentId : null;
    const normalizedTargetUrl = this.normalizeTargetUrl(targetUrl);

    const storedEvent = await this.prisma.webhookEvent.create({
      data: {
        event,
        appointmentId,
        targetUrl: normalizedTargetUrl,
        payload: payload as Prisma.InputJsonValue,
        status: 'pending',
        retries: 0,
      },
    });

    await this.enqueueWebhook(storedEvent);

    return {
      success: true,
      id: storedEvent.id,
      status: storedEvent.status,
    };
  }

  private async enqueueWebhook(storedEvent: WebhookEvent) {
    await this.webhookQueue.add(
      'process-webhook',
      {
        id: storedEvent.id,
        event: storedEvent.event,
        appointmentId: storedEvent.appointmentId,
        payload: storedEvent.payload,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }

  private normalizeTargetUrl(targetUrl?: string) {
    if (typeof targetUrl !== 'string') {
      return null;
    }

    const trimmedTargetUrl = targetUrl.trim();
    return trimmedTargetUrl.length > 0 ? trimmedTargetUrl : null;
  }
}
