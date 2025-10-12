import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { StartupOptionsService } from './startup-options.service';
import { CreateStartupOptionDto } from './dto/create-startup-option.dto';
import { UpdateStartupOptionDto } from './dto/update-startup-option.dto';
import { BasicAuthGuard } from '../auth/guards/basic-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('startup-options')
@UseGuards(BasicAuthGuard, RolesGuard)
export class StartupOptionsController {
  constructor(private readonly startupOptionsService: StartupOptionsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createStartupOptionDto: CreateStartupOptionDto) {
    return this.startupOptionsService.create(createStartupOptionDto);
  }

  @Get()
  findAll() {
    return this.startupOptionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.startupOptionsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateStartupOptionDto: UpdateStartupOptionDto) {
    return this.startupOptionsService.update(+id, updateStartupOptionDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.startupOptionsService.remove(+id);
  }
}
