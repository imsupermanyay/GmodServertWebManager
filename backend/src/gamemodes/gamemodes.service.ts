import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gamemode } from './entities/gamemode.entity';
import { CreateGamemodeDto } from './dto/create-gamemode.dto';
import { UpdateGamemodeDto } from './dto/update-gamemode.dto';

@Injectable()
export class GamemodesService {
  constructor(
    @InjectRepository(Gamemode)
    private gamemodesRepository: Repository<Gamemode>,
  ) {}

  async create(createGamemodeDto: CreateGamemodeDto): Promise<Gamemode> {
    const existing = await this.gamemodesRepository.findOne({
      where: { name: createGamemodeDto.name },
    });

    if (existing) {
      throw new ConflictException('模式名称已存在');
    }

    const gamemode = this.gamemodesRepository.create(createGamemodeDto);
    return this.gamemodesRepository.save(gamemode);
  }

  async findAll(): Promise<Gamemode[]> {
    return this.gamemodesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Gamemode> {
    const gamemode = await this.gamemodesRepository.findOne({ where: { id } });
    if (!gamemode) {
      throw new NotFoundException('模式不存在');
    }
    return gamemode;
  }

  async findByName(name: string): Promise<Gamemode | null> {
    return this.gamemodesRepository.findOne({ where: { name } });
  }

  async update(id: number, updateGamemodeDto: UpdateGamemodeDto): Promise<Gamemode> {
    const gamemode = await this.findOne(id);

    if (updateGamemodeDto.name && updateGamemodeDto.name !== gamemode.name) {
      const existing = await this.gamemodesRepository.findOne({
        where: { name: updateGamemodeDto.name },
      });
      if (existing) {
        throw new ConflictException('模式名称已存在');
      }
    }

    Object.assign(gamemode, updateGamemodeDto);
    return this.gamemodesRepository.save(gamemode);
  }

  async remove(id: number): Promise<void> {
    const gamemode = await this.findOne(id);
    await this.gamemodesRepository.remove(gamemode);
  }

  /**
   * 从仓库名称解析模式名称
   * 例如: "ttt_core" -> "ttt"
   */
  parseGamemodeNameFromRepo(repositoryName: string): string | null {
    const match = repositoryName.match(/^(.+)_(core|online|dev|build)$/);
    return match ? match[1] : null;
  }

  /**
   * 根据模式名称获取所有相关目录
   */
  async getGamemodeDirs(gamemodeName: string): Promise<{
    onlineDir: string;
    devDir: string;
    coreDir: string;
    buildDir: string;
    devRepoUrl: string;
  } | null> {
    const gamemode = await this.findByName(gamemodeName);
    if (!gamemode) {
      return null;
    }

    return {
      onlineDir: gamemode.onlineDir,
      devDir: gamemode.devDir,
      coreDir: gamemode.coreDir,
      buildDir: gamemode.buildDir,
      devRepoUrl: gamemode.devRepoUrl,
    };
  }
}
