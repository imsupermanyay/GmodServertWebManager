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
} from '@nestjs/common';
import { ReposService } from './repos.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateRepoDto } from './dto/create-repo.dto';
import { Repo } from '../entities/repo.entity';

@Controller('repos')
@UseGuards(AuthGuard, RolesGuard)
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Get()
  async findAll(): Promise<Repo[]> {
    return this.reposService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Repo> {
    return this.reposService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() createDto: CreateRepoDto): Promise<Repo> {
    return this.reposService.create(createDto);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Repo>,
  ): Promise<Repo> {
    return this.reposService.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reposService.remove(id);
  }

  @Post(':id/sync')
  @Roles(UserRole.SUPER_ADMIN)
  async sync(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.reposService.syncRepo(id);
    return { message: '仓库同步成功' };
  }

  @Get(':id/branches')
  async getBranches(@Param('id', ParseIntPipe) id: number): Promise<string[]> {
    return this.reposService.getBranches(id);
  }
}
