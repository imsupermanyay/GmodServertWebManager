import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
  Query,
} from '@nestjs/common';
import { InstancesService } from './instances.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { Instance } from '../entities/instance.entity';

@Controller('instances')
@UseGuards(AuthGuard, RolesGuard)
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Get()
  async findAll(@Request() req): Promise<Instance[]> {
    return this.instancesService.findAll(req.user.id, req.user.role);
  }

  @Get('my')
  async findMine(@Request() req): Promise<Instance[]> {
    return this.instancesService.findMine(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<Instance> {
    return this.instancesService.findOne(id, req.user.id, req.user.role);
  }

  @Post()
  async create(
    @Body() createDto: CreateInstanceDto,
    @Request() req,
  ): Promise<Instance> {
    return this.instancesService.create(createDto, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateInstanceDto,
    @Request() req,
  ): Promise<Instance> {
    return this.instancesService.update(
      id,
      updateDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<void> {
    return this.instancesService.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/start')
  async start(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<Instance> {
    return this.instancesService.startContainer(id, req.user.id, req.user.role);
  }

  @Post(':id/stop')
  async stop(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<Instance> {
    return this.instancesService.stopInstance(id, req.user.id, req.user.role);
  }

  @Post(':id/restart')
  async restart(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<Instance> {
    return this.instancesService.restartInstance(
      id,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':id/logs')
  async getLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('tail') tail: number = 100,
    @Request() req,
  ): Promise<{ logs: string }> {
    const logs = await this.instancesService.getContainerLogs(
      id,
      req.user.id,
      req.user.role,
      tail,
    );
    return { logs };
  }

  @Get(':id/status')
  async getStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<any> {
    return this.instancesService.getContainerStatus(
      id,
      req.user.id,
      req.user.role,
    );
  }
}
