import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StartupOption } from './entities/startup-option.entity';
import { CreateStartupOptionDto } from './dto/create-startup-option.dto';
import { UpdateStartupOptionDto } from './dto/update-startup-option.dto';

@Injectable()
export class StartupOptionsService {
  constructor(
    @InjectRepository(StartupOption)
    private startupOptionsRepository: Repository<StartupOption>,
  ) {}

  async create(createStartupOptionDto: CreateStartupOptionDto): Promise<StartupOption> {
    const existing = await this.startupOptionsRepository.findOne({
      where: { name: createStartupOptionDto.name },
    });

    if (existing) {
      throw new ConflictException('启动项名称已存在');
    }

    const option = this.startupOptionsRepository.create(createStartupOptionDto);
    return this.startupOptionsRepository.save(option);
  }

  async findAll(): Promise<StartupOption[]> {
    return this.startupOptionsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<StartupOption> {
    const option = await this.startupOptionsRepository.findOne({ where: { id } });
    if (!option) {
      throw new NotFoundException('启动项不存在');
    }
    return option;
  }

  async update(id: number, updateStartupOptionDto: UpdateStartupOptionDto): Promise<StartupOption> {
    const option = await this.findOne(id);

    if (updateStartupOptionDto.name && updateStartupOptionDto.name !== option.name) {
      const existing = await this.startupOptionsRepository.findOne({
        where: { name: updateStartupOptionDto.name },
      });
      if (existing) {
        throw new ConflictException('启动项名称已存在');
      }
    }

    Object.assign(option, updateStartupOptionDto);
    return this.startupOptionsRepository.save(option);
  }

  async remove(id: number): Promise<void> {
    const option = await this.findOne(id);
    await this.startupOptionsRepository.remove(option);
  }
}
