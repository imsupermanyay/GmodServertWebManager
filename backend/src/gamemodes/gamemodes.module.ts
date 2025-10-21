import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamemodesService } from './gamemodes.service';
import { GamemodesController } from './gamemodes.controller';
import { Gamemode } from './entities/gamemode.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Gamemode])],
  controllers: [GamemodesController],
  providers: [GamemodesService],
  exports: [GamemodesService],
})
export class GamemodesModule {}
