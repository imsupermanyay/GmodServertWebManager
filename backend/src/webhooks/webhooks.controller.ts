import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { GamemodesService } from '../gamemodes/gamemodes.service';

const execAsync = promisify(exec);
const BASE_REPO_DIR = '/opt/gmodgamemodes';

@Controller('webhooks')
export class WebhooksController {
  private readonly repoTasks = new Map<string, Promise<void>>();

  constructor(private readonly gamemodesService: GamemodesService) {}

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

  private async syncCoreToDevRepository(repositoryName: string) {
    try {
      // 解析模式名称
      const gamemodeName = this.gamemodesService.parseGamemodeNameFromRepo(repositoryName);
      if (!gamemodeName) {
        console.warn(`[Webhook][${repositoryName}] Unable to parse gamemode name`);
        return;
      }

      console.log(`[Webhook][${repositoryName}] Parsed gamemode name: ${gamemodeName}`);

      // 获取模式配置
      const gamemodeDirs = await this.gamemodesService.getGamemodeDirs(gamemodeName);
      if (!gamemodeDirs) {
        console.warn(`[Webhook][${repositoryName}] Gamemode config not found for: ${gamemodeName}`);
        return;
      }

      const { coreDir, buildDir, devDir, devRepoUrl } = gamemodeDirs;

      console.log(`[Webhook][${repositoryName}] Syncing to dev repository...`);
      console.log(`  Core Dir: ${coreDir}`);
      console.log(`  Build Dir: ${buildDir}`);
      console.log(`  Dev Dir: ${devDir}`);

      // 检查目录是否存在
      if (!existsSync(coreDir)) {
        console.error(`[Webhook][${repositoryName}] Core directory does not exist: ${coreDir}`);
        return;
      }
      if (!existsSync(buildDir)) {
        console.error(`[Webhook][${repositoryName}] Build directory does not exist: ${buildDir}`);
        return;
      }
      if (!existsSync(devDir)) {
        console.error(`[Webhook][${repositoryName}] Dev directory does not exist: ${devDir}`);
        return;
      }

      // 复制 core 和 build 目录到 dev
      console.log(`[Webhook][${repositoryName}] Copying core directory to dev...`);
      await this.runGitCommand(
        `rsync -av --delete "${coreDir}/" "${devDir}/core/"`,
        repositoryName,
      );

      console.log(`[Webhook][${repositoryName}] Copying build directory to dev...`);
      await this.runGitCommand(
        `rsync -av --delete "${buildDir}/" "${devDir}/build/"`,
        repositoryName,
      );

      // 提交并推送到 dev 仓库
      console.log(`[Webhook][${repositoryName}] Committing changes to dev repository...`);

      // 添加所有更改
      await this.runGitCommand(
        `git -C "${devDir}" add -A`,
        repositoryName,
      );

      // 检查是否有更改需要提交
      const { stdout: statusOutput } = await execAsync(`git -C "${devDir}" status --porcelain`);
      if (!statusOutput.trim()) {
        console.log(`[Webhook][${repositoryName}] No changes to commit in dev repository`);
        return;
      }

      // 提交更改
      const commitMessage = `Auto-sync from ${gamemodeName}_core at ${new Date().toISOString()}`;
      await this.runGitCommand(
        `git -C "${devDir}" commit -m "${commitMessage}"`,
        repositoryName,
      );

      // 推送到远程
      console.log(`[Webhook][${repositoryName}] Pushing to dev repository...`);
      await this.runGitCommand(
        `git -C "${devDir}" push origin HEAD`,
        repositoryName,
      );

      console.log(`[Webhook][${repositoryName}] ✅ Successfully synced to dev repository!`);
    } catch (error) {
      console.error(`[Webhook][${repositoryName}] Failed to sync to dev:`, error.message);
      throw error;
    }
  }

  private async runGitCommand(command: string, repositoryName: string) {
    console.log(`[Webhook][${repositoryName}] Executing command: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    if (stdout) {
      console.log(`[Webhook][${repositoryName}] git stdout:\n${stdout}`);
    }
    if (stderr) {
      console.warn(`[Webhook][${repositoryName}] git stderr:\n${stderr}`);
    }
  }
}
