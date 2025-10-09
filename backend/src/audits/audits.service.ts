import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from '../entities/audit.entity';

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(Audit)
    private auditRepository: Repository<Audit>,
  ) {}

  /**
   * 获取审计日志列表 (分页)
   */
  async findAll(
    page: number = 1,
    limit: number = 50,
    filters?: {
      actorUserId?: number;
      action?: string;
      targetType?: string;
      targetId?: number;
    },
  ): Promise<{ data: Audit[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .orderBy('audit.created_at', 'DESC');

    // 应用过滤条件
    if (filters) {
      if (filters.actorUserId) {
        queryBuilder.andWhere('audit.actor_user_id = :actorUserId', {
          actorUserId: filters.actorUserId,
        });
      }

      if (filters.action) {
        queryBuilder.andWhere('audit.action = :action', {
          action: filters.action,
        });
      }

      if (filters.targetType) {
        queryBuilder.andWhere('audit.target_type = :targetType', {
          targetType: filters.targetType,
        });
      }

      if (filters.targetId) {
        queryBuilder.andWhere('audit.target_id = :targetId', {
          targetId: filters.targetId,
        });
      }
    }

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取单个审计日志详情
   */
  async findOne(id: number): Promise<Audit> {
    return this.auditRepository.findOne({
      where: { id },
      relations: ['actor'],
    });
  }

  /**
   * 创建审计日志
   */
  async create(data: {
    actor_user_id?: number;
    action: string;
    target_type?: string;
    target_id?: number;
    payload?: any;
  }): Promise<Audit> {
    const audit = this.auditRepository.create(data);
    return this.auditRepository.save(audit);
  }

  /**
   * 记录用户操作
   */
  async logUserAction(
    userId: number,
    action: string,
    targetType: string,
    targetId: number,
    payload?: any,
  ): Promise<Audit> {
    return this.create({
      actor_user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      payload,
    });
  }

  /**
   * 记录系统操作
   */
  async logSystemAction(
    action: string,
    targetType?: string,
    targetId?: number,
    payload?: any,
  ): Promise<Audit> {
    return this.create({
      action,
      target_type: targetType,
      target_id: targetId,
      payload,
    });
  }

  /**
   * 记录 Webhook 事件
   */
  async logWebhookEvent(
    action: string,
    payload: any,
  ): Promise<Audit> {
    return this.create({
      action,
      payload,
    });
  }

  /**
   * 清理旧日志 (保留最近90天)
   */
  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :date', { date: cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * 获取用户操作统计
   */
  async getUserStats(userId: number): Promise<any> {
    const stats = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('audit.actor_user_id = :userId', { userId })
      .groupBy('audit.action')
      .getRawMany();

    const total = await this.auditRepository.count({
      where: { actor_user_id: userId },
    });

    return {
      total,
      breakdown: stats,
    };
  }

  /**
   * 获取最近操作
   */
  async getRecentActions(limit: number = 10): Promise<Audit[]> {
    return this.auditRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
      relations: ['actor'],
    });
  }
}
