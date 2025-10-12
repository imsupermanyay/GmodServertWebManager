import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CfgTemplate } from './entities/cfg-template.entity';
import { CreateCfgTemplateDto } from './dto/create-cfg-template.dto';
import { UpdateCfgTemplateDto } from './dto/update-cfg-template.dto';

@Injectable()
export class CfgTemplatesService {
  constructor(
    @InjectRepository(CfgTemplate)
    private cfgTemplatesRepository: Repository<CfgTemplate>,
  ) {}

  async create(createCfgTemplateDto: CreateCfgTemplateDto): Promise<CfgTemplate> {
    const existing = await this.cfgTemplatesRepository.findOne({
      where: { name: createCfgTemplateDto.name },
    });

    if (existing) {
      throw new ConflictException('模板名称已存在');
    }

    const template = this.cfgTemplatesRepository.create(createCfgTemplateDto);
    return this.cfgTemplatesRepository.save(template);
  }

  async findAll(): Promise<CfgTemplate[]> {
    return this.cfgTemplatesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<CfgTemplate> {
    const template = await this.cfgTemplatesRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    return template;
  }

  async update(id: number, updateCfgTemplateDto: UpdateCfgTemplateDto): Promise<CfgTemplate> {
    const template = await this.findOne(id);

    if (updateCfgTemplateDto.name && updateCfgTemplateDto.name !== template.name) {
      const existing = await this.cfgTemplatesRepository.findOne({
        where: { name: updateCfgTemplateDto.name },
      });
      if (existing) {
        throw new ConflictException('模板名称已存在');
      }
    }

    Object.assign(template, updateCfgTemplateDto);
    return this.cfgTemplatesRepository.save(template);
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);
    await this.cfgTemplatesRepository.remove(template);
  }
}
