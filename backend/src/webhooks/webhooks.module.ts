import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { GamemodesModule } from '../gamemodes/gamemodes.module';

@Module({
  imports: [GamemodesModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
