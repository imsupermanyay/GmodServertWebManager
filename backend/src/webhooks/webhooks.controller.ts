import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('webhooks')
export class WebhooksController {
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
    const repositoryName = payload.body?.repository?.name;
    const branchName = this.extractBranchName(req.body?.ref);

    console.log('store 名称', repositoryName);
    console.log('branchname 名称', branchName);
    console.log('event 类型', eventType);

    if (eventType === 'push' && repositoryName) {
      try {
        const { stdout, stderr } = await this.pullRepository(repositoryName, branchName);
        if (stdout) {
          console.log(`[Webhook][${repositoryName}] git stdout:\n${stdout}`);
        }
        if (stderr) {
          console.warn(`[Webhook][${repositoryName}] git stderr:\n${stderr}`);
        }
      } catch (error) {
        console.error(`[Webhook][${repositoryName}] git pull failed:`, error);
      }
    } else {
      console.log('[Webhook] Skipping git pull because event is not push or repository name is missing');
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

  private pullRepository(repositoryName: string, branchName: string | null) {
    const repoPath = `/opt/gmodgamemodes/${repositoryName}`;
    const args = branchName ? ` origin ${branchName}` : '';
    const command = `git -C ${repoPath} pull${args}`;

    console.log(`[Webhook][${repositoryName}] Executing command: ${command}`);
    return execAsync(command);
  }
}
