import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  Get,
  Delete,
  UseGuards,
  ParseIntPipe,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * 接收 Gitea Push Webhook
   * POST /webhooks/gitea
   */
  @Post('gitea')
  async handleGiteaWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-gitea-signature') signature: string,
    @Body() body: any,
  ): Promise<{ message: string }> {
    if (!signature) {
      return { message: 'Missing signature header' };
    }

    // 获取原始请求体 (用于签名验证)
    const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(body);

    // 提取仓库名称和分支
    const repoName = body.repository?.name;
    const ref = body.ref; // 例如: "refs/heads/main"

    if (!repoName || !ref) {
      return { message: 'Invalid webhook payload' };
    }

    // 提取分支名称 (去掉 "refs/heads/" 前缀)
    const branch = ref.replace('refs/heads/', '');

    // 处理 webhook
    await this.webhooksService.handleGiteaPush(
      repoName,
      branch,
      signature,
      rawBody,
    );

    return { message: 'Webhook processed successfully' };
  }

  /**
   * 设置 Webhook Secret
   * POST /webhooks/secret/:repoId
   */
  @Post('secret/:repoId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async setSecret(
    @Param('repoId', ParseIntPipe) repoId: number,
    @Body() data: { secret: string },
  ): Promise<{ message: string }> {
    await this.webhooksService.setWebhookSecret(repoId, data.secret);
    return { message: 'Webhook Secret 设置成功' };
  }

  /**
   * 获取 Webhook Secret
   * GET /webhooks/secret/:repoId
   */
  @Get('secret/:repoId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getSecret(
    @Param('repoId', ParseIntPipe) repoId: number,
  ): Promise<{ secret: string }> {
    const webhookSecret = await this.webhooksService.getWebhookSecret(repoId);
    return { secret: webhookSecret.secret };
  }

  /**
   * 删除 Webhook Secret
   * DELETE /webhooks/secret/:repoId
   */
  @Delete('secret/:repoId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async deleteSecret(
    @Param('repoId', ParseIntPipe) repoId: number,
  ): Promise<{ message: string }> {
    await this.webhooksService.deleteWebhookSecret(repoId);
    return { message: 'Webhook Secret 删除成功' };
  }

  /**
   * 生成随机 Webhook Secret
   * GET /webhooks/generate-secret
   */
  @Get('generate-secret')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  generateSecret(): { secret: string } {
    const secret = this.webhooksService.generateSecret();
    return { secret };
  }
}
