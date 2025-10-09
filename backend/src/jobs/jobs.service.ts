import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from '../entities/job.entity';
import { JobType } from '../common/enums/job-type.enum';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectQueue('gmod-tasks')
    private taskQueue: Queue,
  ) {}

  /**
   * 获取所有任务列表
   */
  async findAll(): Promise<Job[]> {
    return this.jobRepository.find({
      order: { created_at: 'DESC' },
      take: 100, // 限制返回最近100条
    });
  }

  /**
   * 获取单个任务详情
   */
  async findOne(id: number): Promise<Job> {
    return this.jobRepository.findOne({ where: { id } });
  }

  /**
   * 创建新任务并加入队列
   */
  async createJob(type: JobType, payload: any): Promise<Job> {
    // 创建数据库记录
    const job = this.jobRepository.create({
      type,
      payload,
      status: 'pending',
    });

    const savedJob = await this.jobRepository.save(job);

    // 加入 BullMQ 队列
    await this.taskQueue.add(type, {
      jobId: savedJob.id,
      type,
      payload,
    });

    return savedJob;
  }

  /**
   * 更新任务状态
   */
  async updateJobStatus(
    id: number,
    status: string,
    lastError?: string,
  ): Promise<Job> {
    const job = await this.findOne(id);

    if (!job) {
      throw new Error(`任务 ID ${id} 不存在`);
    }

    job.status = status;
    if (lastError) {
      job.last_error = lastError;
    }

    return this.jobRepository.save(job);
  }

  /**
   * 增加任务重试次数
   */
  async incrementRetryCount(id: number): Promise<Job> {
    const job = await this.findOne(id);

    if (!job) {
      throw new Error(`任务 ID ${id} 不存在`);
    }

    job.retry_count += 1;

    return this.jobRepository.save(job);
  }

  /**
   * 创建 Git 同步任务
   */
  async createGitSyncJob(bindingId: number): Promise<Job> {
    return this.createJob(JobType.GIT_SYNC, { bindingId });
  }

  /**
   * 创建实例启动任务
   */
  async createInstanceStartJob(instanceId: number): Promise<Job> {
    return this.createJob(JobType.INSTANCE_START, { instanceId });
  }

  /**
   * 创建实例停止任务
   */
  async createInstanceStopJob(instanceId: number): Promise<Job> {
    return this.createJob(JobType.INSTANCE_STOP, { instanceId });
  }

  /**
   * 创建实例重启任务
   */
  async createInstanceRestartJob(instanceId: number): Promise<Job> {
    return this.createJob(JobType.INSTANCE_RESTART, { instanceId });
  }

  /**
   * 创建链接刷新任务
   */
  async createLinkRefreshJob(bindingId: number): Promise<Job> {
    return this.createJob(JobType.LINK_REFRESH, { bindingId });
  }

  /**
   * 清理旧任务 (保留最近30天)
   */
  async cleanOldJobs(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.jobRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :date', { date: thirtyDaysAgo })
      .andWhere('status IN (:...statuses)', {
        statuses: ['completed', 'failed'],
      })
      .execute();

    return result.affected || 0;
  }
}
