import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { AuditsService } from './audits.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { Audit } from '../entities/audit.entity';

@Controller('audits')
@UseGuards(AuthGuard, RolesGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  /**
   * 获取审计日志列表 (超级管理员)
   * GET /audits?page=1&limit=50&action=CREATE_INSTANCE
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ): Promise<{
    data: Audit[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const filters: any = {};
    if (actorUserId) filters.actorUserId = parseInt(actorUserId, 10);
    if (action) filters.action = action;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = parseInt(targetId, 10);

    return this.auditsService.findAll(pageNum, limitNum, filters);
  }

  /**
   * 获取单个审计日志详情
   * GET /audits/:id
   */
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Audit> {
    return this.auditsService.findOne(id);
  }

  /**
   * 获取当前用户的操作统计
   * GET /audits/my/stats
   */
  @Get('my/stats')
  async getMyStats(@Request() req): Promise<any> {
    return this.auditsService.getUserStats(req.user.id);
  }

  /**
   * 获取指定用户的操作统计 (超级管理员)
   * GET /audits/user/:userId/stats
   */
  @Get('user/:userId/stats')
  @Roles(UserRole.SUPER_ADMIN)
  async getUserStats(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<any> {
    return this.auditsService.getUserStats(userId);
  }

  /**
   * 获取最近操作
   * GET /audits/recent?limit=10
   */
  @Get('recent/actions')
  @Roles(UserRole.SUPER_ADMIN)
  async getRecentActions(@Query('limit') limit?: string): Promise<Audit[]> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.auditsService.getRecentActions(limitNum);
  }
}
