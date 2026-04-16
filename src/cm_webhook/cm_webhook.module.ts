import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { CmWebhookController } from './cm_webhook.controller';
import { CmWebhookService } from './cm_webhook.service';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [CmWebhookController],
  providers: [CmWebhookService],
})
export class CmWebhookModule {}
