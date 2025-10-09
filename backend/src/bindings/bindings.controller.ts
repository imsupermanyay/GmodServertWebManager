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
} from '@nestjs/common';
import { BindingsService } from './bindings.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateBindingDto } from './dto/create-binding.dto';
import { Binding } from '../entities/binding.entity';

@Controller('bindings')
@UseGuards(AuthGuard, RolesGuard)
export class BindingsController {
  constructor(private readonly bindingsService: BindingsService) {}

  @Get()
  async findAll(@Request() req): Promise<Binding[]> {
    return this.bindingsService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<Binding> {
    return this.bindingsService.findOne(id, req.user.id, req.user.role);
  }

  @Post()
  async create(
    @Body() createDto: CreateBindingDto,
    @Request() req,
  ): Promise<Binding> {
    return this.bindingsService.create(createDto, req.user.id, req.user.role);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { enabled: boolean },
    @Request() req,
  ): Promise<Binding> {
    return this.bindingsService.update(
      id,
      data.enabled,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<void> {
    return this.bindingsService.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/refresh')
  async refresh(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.bindingsService.refresh(id, req.user.id, req.user.role);
    return { message: '软链接刷新成功' };
  }

  @Post(':id/sync')
  async sync(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.bindingsService.syncWorktree(id, req.user.id, req.user.role);
    return { message: 'Worktree 同步成功' };
  }
}
