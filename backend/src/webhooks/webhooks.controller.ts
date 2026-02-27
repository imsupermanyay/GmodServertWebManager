import { Controller, Get, Post, Req, Body, UseGuards, Query } from '@nestjs/common';
import { Request } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamemodesService } from '../gamemodes/gamemodes.service';
import { SyncLog, SyncStatus } from './entities/sync-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

const execAsync = promisify(exec);
const BASE_REPO_DIR = '/opt/allgamemodes';
const EXEC_OPTIONS = { maxBuffer: 50 * 1024 * 1024 }; // 50MB

@Controller('webhooks')
export class WebhooksController {
  private readonly repoTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly gamemodesService: GamemodesService,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
  ) { }

  @Get('gitea')
  handleGiteaWebhook(@Req() req: Request) {
    return this.logAndRespond(req);
  }

  @Post('gitea')
  handleGiteaWebhookPost(@Req() req: Request) {
    return this.logAndRespond(req);
  }

  private async logAndRespond(req: Request) {
    const payload = {
      headers: req.headers,
      query: req.query,
      body: req.body,
      method: req.method,
      url: req.originalUrl,
    };

    // console.log('[Gitea Webhook] Incoming payload:', JSON.stringify(payload, null, 2));

    const eventHeader = req.headers['x-gitea-event'] ?? req.headers['x-github-event'];
    const eventType = Array.isArray(eventHeader) ? eventHeader[0] : eventHeader;
    const repositoryName = this.sanitizeRepositoryName(payload.body?.repository?.name);
    const branchName =
      this.sanitizeBranchName(this.extractBranchName(req.body?.ref)) ??
      this.sanitizeBranchName(payload.body?.repository?.default_branch) ??
      'main';

    console.log('store 名称', repositoryName);
    console.log('branchname 名称', branchName);
    console.log('event 类型', eventType);

    if (eventType === 'push' && repositoryName) {
      this.enqueueRepoTask(repositoryName, async () => {
        await this.syncRepository(repositoryName, branchName);
      }).catch((error) => {
        console.error(`[Webhook][${repositoryName}] sync task failed:`, error);
      });
    } else {
      console.log('[Webhook] Skipping git sync because event is not push or repository name is missing');
    }

    return {
      message: 'Webhook received',
      receivedAt: new Date().toISOString(),
      ...payload,
    };
  }

  private extractBranchName(ref?: unknown): string | null {
    if (typeof ref !== 'string') {
      return null;
    }
    const prefix = 'refs/heads/';
    if (ref.startsWith(prefix)) {
      return ref.slice(prefix.length);
    }
    return ref || null;
  }

  private sanitizeRepositoryName(name?: unknown): string | null {
    if (typeof name !== 'string') {
      return null;
    }
    const trimmed = name.trim();
    return /^[A-Za-z0-9._-]+$/.test(trimmed) ? trimmed : null;
  }

  private sanitizeBranchName(name?: unknown): string | null {
    if (typeof name !== 'string') {
      return null;
    }
    const trimmed = name.trim();
    return /^[A-Za-z0-9._/-]+$/.test(trimmed) ? trimmed : null;
  }

  private enqueueRepoTask(repositoryName: string, task: () => Promise<void>) {
    const previous = this.repoTasks.get(repositoryName) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);

    const tracked = next
      .catch((error) => {
        console.error(`[Webhook][${repositoryName}] task error:`, error);
      })
      .finally(() => {
        if (this.repoTasks.get(repositoryName) === tracked) {
          this.repoTasks.delete(repositoryName);
        }
      });

    this.repoTasks.set(repositoryName, tracked);
    return next;
  }

  private async syncRepository(repositoryName: string, branchName: string) {
    const repoPath = `${BASE_REPO_DIR}/${repositoryName}`;
    if (!existsSync(repoPath)) {
      console.warn(`[Webhook][${repositoryName}] Repository path does not exist: ${repoPath}`);
      return;
    }

    // 1. Pull core 仓库的更新
    await this.runGitCommand(
      `git -C "${repoPath}" fetch --all --prune`,
      repositoryName,
    );
    await this.runGitCommand(
      `git -C "${repoPath}" reset --hard origin/${branchName}`,
      repositoryName,
    );

    // 2. 如果是 _core 仓库，则同步到 dev
    if (repositoryName.endsWith('_core')) {
      await this.syncCoreToDevRepository(repositoryName);
    }
  }

  private async syncCoreToDevRepository(repositoryName: string, isManualSync: boolean = false) {
    let syncLog: SyncLog = null;

    try {
      // 解析模式名称
      const gamemodeName = this.gamemodesService.parseGamemodeNameFromRepo(repositoryName);
      if (!gamemodeName) {
        console.warn(`[Webhook][${repositoryName}] Unable to parse gamemode name`);
        return;
      }

      console.log(`[Webhook][${repositoryName}] Parsed gamemode name: ${gamemodeName}`);

      // 创建同步日志
      syncLog = this.syncLogRepository.create({
        gamemodeName,
        repositoryName,
        status: SyncStatus.IN_PROGRESS,
        isManualSync,
        message: '开始同步...',
      });
      await this.syncLogRepository.save(syncLog);

      // 获取模式配置
      const gamemodeDirs = await this.gamemodesService.getGamemodeDirs(gamemodeName);
      if (!gamemodeDirs) {
        const errorMsg = `Gamemode config not found for: ${gamemodeName}`;
        console.warn(`[Webhook][${repositoryName}] ${errorMsg}`);
        await this.updateSyncLog(syncLog.id, SyncStatus.FAILED, errorMsg, errorMsg);
        return;
      }

      const { coreDir, buildDir, devDir, devRepoUrl } = gamemodeDirs;

      console.log(`[Webhook][${repositoryName}] Syncing to dev repository...`);
      console.log(`  Core Dir: ${coreDir}`);
      console.log(`  Build Dir: ${buildDir}`);
      console.log(`  Dev Dir: ${devDir}`);

      // 检查目录是否存在
      if (!existsSync(coreDir)) {
        const errorMsg = `Core directory does not exist: ${coreDir}`;
        console.error(`[Webhook][${repositoryName}] ${errorMsg}`);
        await this.updateSyncLog(syncLog.id, SyncStatus.FAILED, '核心目录不存在', errorMsg);
        return;
      }
      if (!existsSync(buildDir)) {
        const errorMsg = `Build directory does not exist: ${buildDir}`;
        console.error(`[Webhook][${repositoryName}] ${errorMsg}`);
        await this.updateSyncLog(syncLog.id, SyncStatus.FAILED, '构建目录不存在', errorMsg);
        return;
      }
      if (!existsSync(devDir)) {
        const errorMsg = `Dev directory does not exist: ${devDir}`;
        console.error(`[Webhook][${repositoryName}] ${errorMsg}`);
        await this.updateSyncLog(syncLog.id, SyncStatus.FAILED, '开发目录不存在', errorMsg);
        return;
      }

      // === 在临时目录中完成所有合并和 git 操作，避免在容器挂载目录上产生海量文件事件 ===
      const stagingDir = `${devDir}_staging`;

      // 清理可能残留的 staging 目录
      await this.runGitCommand(`rm -rf "${stagingDir}"`, repositoryName);

      // 复制 devDir 到 staging（包括 .git）
      console.log(`[Webhook][${repositoryName}] Creating staging directory...`);
      await this.runGitCommand(`cp -a "${devDir}" "${stagingDir}"`, repositoryName);

      // 在 staging 目录中执行所有操作
      console.log(`[Webhook][${repositoryName}] Cleaning staging directory (keeping .git)...`);
      await this.runGitCommand(
        `find "${stagingDir}" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +`,
        repositoryName,
      );

      console.log(`[Webhook][${repositoryName}] Syncing build directory into staging...`);
      await this.runGitCommand(
        `rsync -a --delete --exclude '.git/' --exclude '.git' "${buildDir}/" "${stagingDir}/"`,
        repositoryName,
      );

      console.log(`[Webhook][${repositoryName}] Overlaying core directory into staging...`);
      await this.runGitCommand(
        `rsync -a --exclude '.git/' --exclude '.git' "${coreDir}/" "${stagingDir}/"`,
        repositoryName,
      );

      // 在 staging 中完成 git 操作
      console.log(`[Webhook][${repositoryName}] Committing changes in staging...`);
      await this.runGitCommand(`git -C "${stagingDir}" add -A`, repositoryName);

      const { stdout: statusOutput } = await execAsync(`git -C "${stagingDir}" status --porcelain`, EXEC_OPTIONS);
      if (!statusOutput.trim()) {
        console.log(`[Webhook][${repositoryName}] No changes to commit in dev repository`);
        await this.runGitCommand(`rm -rf "${stagingDir}"`, repositoryName);
        await this.updateSyncLog(syncLog.id, SyncStatus.SUCCESS, '同步成功（无更改）', null);
        return;
      }

      const commitMessage = `Auto-sync from ${gamemodeName}_core at ${new Date().toISOString()}`;
      await this.runGitCommand(
        `git -C "${stagingDir}" commit -m "${commitMessage}"`,
        repositoryName,
      );

      console.log(`[Webhook][${repositoryName}] Pushing from staging...`);
      await this.runGitCommand(
        `git -C "${stagingDir}" push origin HEAD`,
        repositoryName,
      );

      // === 原子切换：用 staging 替换 devDir ===
      // rename 是原子操作，Gmod 只会看到一次目录变化
      const oldDir = `${devDir}_old`;
      console.log(`[Webhook][${repositoryName}] Atomic swap: staging -> dev...`);
      await this.runGitCommand(`rm -rf "${oldDir}"`, repositoryName);
      await this.runGitCommand(`mv "${devDir}" "${oldDir}" && mv "${stagingDir}" "${devDir}"`, repositoryName);
      await this.runGitCommand(`rm -rf "${oldDir}"`, repositoryName);

      console.log(`[Webhook][${repositoryName}] ✅ Successfully synced to dev repository!`);
      await this.updateSyncLog(syncLog.id, SyncStatus.SUCCESS, '同步成功', null);
    } catch (error) {
      console.error(`[Webhook][${repositoryName}] Failed to sync to dev:`, error.message);
      if (syncLog) {
        await this.updateSyncLog(syncLog.id, SyncStatus.FAILED, '同步失败', error.message + '\n' + error.stack);
      }
      throw error;
    }
  }

  private async updateSyncLog(id: number, status: SyncStatus, message: string, errorDetails: string | null) {
    await this.syncLogRepository.update(id, {
      status,
      message,
      errorDetails,
      completedAt: new Date(),
    });
  }

  private async runGitCommand(command: string, repositoryName: string) {
    console.log(`[Webhook][${repositoryName}] Executing: ${command}`);
    try {
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });
    } catch (error) {
      console.error(`[Webhook][${repositoryName}] Command failed: ${error.message}`);
      throw error;
    }
  }

  // 手动触发同步（所有登录用户都可以触发）
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async manualSync(@Body('gamemodeName') gamemodeName: string) {
    if (!gamemodeName) {
      return {
        success: false,
        message: '游戏模式名称不能为空',
      };
    }

    const repositoryName = `${gamemodeName}_core`;

    // 使用队列机制触发同步
    this.enqueueRepoTask(repositoryName, async () => {
      await this.syncCoreToDevRepository(repositoryName, true);
    }).catch((error) => {
      console.error(`[ManualSync][${repositoryName}] sync task failed:`, error);
    });

    return {
      success: true,
      message: '同步任务已加入队列',
      gamemodeName,
    };
  }

  // 获取同步日志列表（所有登录用户都可以查看）
  @Get('sync-logs')
  @UseGuards(JwtAuthGuard)
  async getSyncLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('gamemodeName') gamemodeName?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = this.syncLogRepository
      .createQueryBuilder('syncLog')
      .orderBy('syncLog.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum);

    if (gamemodeName) {
      queryBuilder.where('syncLog.gamemodeName = :gamemodeName', { gamemodeName });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}
