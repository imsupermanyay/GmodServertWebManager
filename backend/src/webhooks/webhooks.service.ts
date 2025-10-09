import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookSecret } from '../entities/webhook-secret.entity';
import { Repo } from '../entities/repo.entity';
import { Binding } from '../entities/binding.entity';
import { JobsService } from '../jobs/jobs.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookSecret)
    private webhookSecretRepository: Repository<WebhookSecret>,
    @InjectRepository(Repo)
    private repoRepository: Repository<Repo>,
    @InjectRepository(Binding)
    private bindingRepository: Repository<Binding>,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * 验证 Gitea Webhook 签名 (HMAC-SHA256)
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature),
    );
  }

  /**
   * 处理 Gitea Push 事件
   */
  async handleGiteaPush(
    repoName: string,
    branch: string,
    signature: string,
    rawPayload: string,
  ): Promise<void> {
    // 查找仓库
    const repo = await this.repoRepository.findOne({
      where: { name: repoName },
      relations: ['webhook_secret'],
    });

    if (!repo) {
      throw new BadRequestException(`仓库 ${repoName} 不存在`);
    }

    // 验证签名
    if (!repo.webhook_secret) {
      throw new UnauthorizedException(`仓库 ${repoName} 未配置 Webhook Secret`);
    }

    const isValid = this.verifySignature(
      rawPayload,
      signature,
      repo.webhook_secret.secret,
    );

    if (!isValid) {
      throw new UnauthorizedException('Webhook 签名验证失败');
    }

    // 查找所有使用此分支的绑定
    const bindings = await this.bindingRepository.find({
      where: {
        repo_id: repo.id,
        branch,
        enabled: true,
      },
      relations: ['instance'],
    });

    if (bindings.length === 0) {
      console.log(`没有找到使用分支 ${branch} 的绑定,跳过处理`);
      return;
    }

    // 为每个绑定创建 Git 同步任务
    for (const binding of bindings) {
      await this.jobsService.createGitSyncJob(binding.id);
      console.log(
        `已为绑定 ID ${binding.id} (实例: ${binding.instance.name}) 创建 Git 同步任务`,
      );
    }
  }

  /**
   * 创建或更新 Webhook Secret
   */
  async setWebhookSecret(repoId: number, secret: string): Promise<WebhookSecret> {
    // 检查仓库是否存在
    const repo = await this.repoRepository.findOne({ where: { id: repoId } });
    if (!repo) {
      throw new BadRequestException(`仓库 ID ${repoId} 不存在`);
    }

    // 查找已有的 secret
    let webhookSecret = await this.webhookSecretRepository.findOne({
      where: { repo_id: repoId },
    });

    if (webhookSecret) {
      // 更新
      webhookSecret.secret = secret;
    } else {
      // 创建
      webhookSecret = this.webhookSecretRepository.create({
        repo_id: repoId,
        secret,
      });
    }

    return this.webhookSecretRepository.save(webhookSecret);
  }

  /**
   * 获取 Webhook Secret
   */
  async getWebhookSecret(repoId: number): Promise<WebhookSecret> {
    const secret = await this.webhookSecretRepository.findOne({
      where: { repo_id: repoId },
    });

    if (!secret) {
      throw new BadRequestException(`仓库 ID ${repoId} 未配置 Webhook Secret`);
    }

    return secret;
  }

  /**
   * 删除 Webhook Secret
   */
  async deleteWebhookSecret(repoId: number): Promise<void> {
    const secret = await this.getWebhookSecret(repoId);
    await this.webhookSecretRepository.remove(secret);
  }

  /**
   * 生成随机 Webhook Secret
   */
  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
