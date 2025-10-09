import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullJob } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobsService } from './jobs.service';
import { JobType } from '../common/enums/job-type.enum';
import { Binding } from '../entities/binding.entity';
import { Instance } from '../entities/instance.entity';
import { BindingsService } from '../bindings/bindings.service';
import { InstancesService } from '../instances/instances.service';
import { UserRole } from '../common/enums/user-role.enum';

@Processor('gmod-tasks')
@Injectable()
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly bindingsService: BindingsService,
    private readonly instancesService: InstancesService,
    @InjectRepository(Binding)
    private bindingRepository: Repository<Binding>,
    @InjectRepository(Instance)
    private instanceRepository: Repository<Instance>,
  ) {
    super();
  }

  async process(job: BullJob): Promise<any> {
    const { jobId, type, payload } = job.data;

    this.logger.log(`处理任务: ${type} (Job ID: ${jobId})`);

    try {
      // 更新任务状态为运行中
      await this.jobsService.updateJobStatus(jobId, 'running');

      let result;

      switch (type) {
        case JobType.GIT_SYNC:
          result = await this.handleGitSync(payload);
          break;

        case JobType.INSTANCE_START:
          result = await this.handleInstanceStart(payload);
          break;

        case JobType.INSTANCE_STOP:
          result = await this.handleInstanceStop(payload);
          break;

        case JobType.INSTANCE_RESTART:
          result = await this.handleInstanceRestart(payload);
          break;

        case JobType.LINK_REFRESH:
          result = await this.handleLinkRefresh(payload);
          break;

        default:
          throw new Error(`未知的任务类型: ${type}`);
      }

      // 更新任务状态为完成
      await this.jobsService.updateJobStatus(jobId, 'completed');

      this.logger.log(`任务完成: ${type} (Job ID: ${jobId})`);

      return result;
    } catch (error) {
      this.logger.error(`任务失败: ${type} (Job ID: ${jobId})`, error.stack);

      // 增加重试次数
      await this.jobsService.incrementRetryCount(jobId);

      // 更新任务状态为失败
      await this.jobsService.updateJobStatus(
        jobId,
        'failed',
        error.message || error.toString(),
      );

      throw error;
    }
  }

  /**
   * 处理 Git 同步任务
   */
  private async handleGitSync(payload: { bindingId: number }): Promise<void> {
    const { bindingId } = payload;

    const binding = await this.bindingRepository.findOne({
      where: { id: bindingId },
      relations: ['instance', 'repo'],
    });

    if (!binding) {
      throw new Error(`绑定 ID ${bindingId} 不存在`);
    }

    // 使用超级管理员权限执行同步
    await this.bindingsService.syncWorktree(
      bindingId,
      binding.instance.owner_user_id,
      UserRole.SUPER_ADMIN,
    );

    // 如果实例设置了自动重启,则重启实例
    if (binding.instance.auto_restart_on_code_change) {
      await this.jobsService.createInstanceRestartJob(binding.instance.id);
    }
  }

  /**
   * 处理实例启动任务
   */
  private async handleInstanceStart(payload: {
    instanceId: number;
  }): Promise<void> {
    const { instanceId } = payload;

    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`实例 ID ${instanceId} 不存在`);
    }

    // 使用超级管理员权限执行启动
    await this.instancesService.startContainer(
      instanceId,
      instance.owner_user_id,
      UserRole.SUPER_ADMIN,
    );
  }

  /**
   * 处理实例停止任务
   */
  private async handleInstanceStop(payload: {
    instanceId: number;
  }): Promise<void> {
    const { instanceId } = payload;

    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`实例 ID ${instanceId} 不存在`);
    }

    // 使用超级管理员权限执行停止
    await this.instancesService.stopInstance(
      instanceId,
      instance.owner_user_id,
      UserRole.SUPER_ADMIN,
    );
  }

  /**
   * 处理实例重启任务
   */
  private async handleInstanceRestart(payload: {
    instanceId: number;
  }): Promise<void> {
    const { instanceId } = payload;

    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`实例 ID ${instanceId} 不存在`);
    }

    // 使用超级管理员权限执行重启
    await this.instancesService.restartInstance(
      instanceId,
      instance.owner_user_id,
      UserRole.SUPER_ADMIN,
    );
  }

  /**
   * 处理链接刷新任务
   */
  private async handleLinkRefresh(payload: {
    bindingId: number;
  }): Promise<void> {
    const { bindingId } = payload;

    const binding = await this.bindingRepository.findOne({
      where: { id: bindingId },
      relations: ['instance'],
    });

    if (!binding) {
      throw new Error(`绑定 ID ${bindingId} 不存在`);
    }

    // 使用超级管理员权限执行刷新
    await this.bindingsService.refresh(
      bindingId,
      binding.instance.owner_user_id,
      UserRole.SUPER_ADMIN,
    );
  }
}
