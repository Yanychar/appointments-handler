import { Body, Controller, Headers, Post } from '@nestjs/common';
import { CmWebhookService } from './cm_webhook.service';

@Controller('cm-webhook')
export class CmWebhookController {
  constructor(private readonly cmWebhookService: CmWebhookService) {}

  @Post()
  async handleWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-target-url') targetUrl?: string,
  ) {
    console.log('Incoming webhook:', payload);
    await this.cmWebhookService.processIncoming(payload, targetUrl);

    return { status: 'accepted' };
  }
}
