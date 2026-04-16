import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhookProcessor } from './webhook.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'webhook',
    }),
  ],
  providers: [WebhookProcessor],
  exports: [BullModule],
})
export class QueueModule {}
