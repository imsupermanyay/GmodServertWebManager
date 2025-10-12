import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { InstancesService } from './instances.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { BasicAuthGuard } from '../auth/guards/basic-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('instances')
@UseGuards(BasicAuthGuard, RolesGuard)
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createInstanceDto: CreateInstanceDto) {
    return this.instancesService.create(createInstanceDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.instancesService.findAll(req.user.id, req.user.role);
  }

  @Get('my')
  @Roles(UserRole.ADMIN)
  getMyInstances(@Request() req) {
    return this.instancesService.getMyInstances(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.instancesService.findOne(+id, req.user.id, req.user.role);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateInstanceDto: UpdateInstanceDto) {
    return this.instancesService.update(+id, updateInstanceDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.instancesService.remove(+id);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Request() req) {
    return this.instancesService.start(+id, req.user.id, req.user.role);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string, @Request() req) {
    return this.instancesService.stop(+id, req.user.id, req.user.role);
  }

  @Post(':id/restart')
  restart(@Param('id') id: string, @Request() req) {
    return this.instancesService.restart(+id, req.user.id, req.user.role);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Request() req) {
    return this.instancesService.getLogs(+id, req.user.id, req.user.role);
  }

  @Get(':id/info')
  getInfo(@Param('id') id: string, @Request() req) {
    return this.instancesService.getInstanceInfo(+id, req.user.id, req.user.role);
  }
}
