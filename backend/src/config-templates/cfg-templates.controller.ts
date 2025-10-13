import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CfgTemplatesService } from './cfg-templates.service';
import { CreateCfgTemplateDto } from './dto/create-cfg-template.dto';
import { UpdateCfgTemplateDto } from './dto/update-cfg-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('cfg-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CfgTemplatesController {
  constructor(private readonly cfgTemplatesService: CfgTemplatesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createCfgTemplateDto: CreateCfgTemplateDto) {
    return this.cfgTemplatesService.create(createCfgTemplateDto);
  }

  @Get()
  findAll() {
    return this.cfgTemplatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cfgTemplatesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateCfgTemplateDto: UpdateCfgTemplateDto) {
    return this.cfgTemplatesService.update(+id, updateCfgTemplateDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.cfgTemplatesService.remove(+id);
  }
}
