import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { GamemodesService } from './gamemodes.service';
import { CreateGamemodeDto } from './dto/create-gamemode.dto';
import { UpdateGamemodeDto } from './dto/update-gamemode.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gamemodes')
@UseGuards(JwtAuthGuard)
export class GamemodesController {
  constructor(private readonly gamemodesService: GamemodesService) {}

  @Post()
  create(@Body() createGamemodeDto: CreateGamemodeDto) {
    return this.gamemodesService.create(createGamemodeDto);
  }

  @Get()
  findAll() {
    return this.gamemodesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamemodesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGamemodeDto: UpdateGamemodeDto) {
    return this.gamemodesService.update(+id, updateGamemodeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gamemodesService.remove(+id);
  }
}
