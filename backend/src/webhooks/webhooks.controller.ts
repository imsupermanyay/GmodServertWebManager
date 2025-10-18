import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const BASE_REPO_DIR = '/opt/allgamemodes';

@Controller('webhooks')
export class WebhooksController {
  private readonly repoTasks = new Map<string, Promise<void>>();

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

    console.log('[Gitea Webhook] Incoming payload:', JSON.stringify(payload, null, 2));

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

    await this.runGitCommand(
      `git -C "${repoPath}" fetch --all --prune`,
      repositoryName,
    );
    await this.runGitCommand(
      `git -C "${repoPath}" reset --hard origin/${branchName}`,
      repositoryName,
    );
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
