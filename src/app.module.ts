import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CmWebhookModule } from './cm_webhook/cm_webhook.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [PrismaModule, CmWebhookModule, RedisModule, QueueModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
