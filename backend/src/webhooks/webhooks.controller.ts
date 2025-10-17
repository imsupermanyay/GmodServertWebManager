import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';

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

  private logAndRespond(req: Request) {
    const payload = {
      headers: req.headers,
      query: req.query,
      body: req.body,
      method: req.method,
      url: req.originalUrl,
    };

    // 简单打印，便于在日志中查看所有信息
    // 注意：生产环境可能包含敏感信息，请酌情处理
    console.log('[Gitea Webhook] Incoming payload:', JSON.stringify(payload, null, 2));

    return {
      message: 'Webhook received',
      receivedAt: new Date().toISOString(),
      ...payload,
    };
  }
}
