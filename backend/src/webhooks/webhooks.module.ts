import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { GamemodesModule } from '../gamemodes/gamemodes.module';
import { SyncLog } from './entities/sync-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncLog]),
    GamemodesModule,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
