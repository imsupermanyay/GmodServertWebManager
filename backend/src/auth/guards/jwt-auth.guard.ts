import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.log(`JWT 认证检查: ${request.method} ${request.url}`);
    this.logger.log(`Authorization header: ${authHeader ? authHeader.substring(0, 20) + '...' : '未提供'}`);

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      this.logger.error(`JWT 认证失败: ${err?.message || info?.message || '未知错误'}`);
      if (info) {
        this.logger.error(`详细信息: ${JSON.stringify(info)}`);
      }
      throw err || new UnauthorizedException('认证失败');
    }

    this.logger.log(`JWT 认证成功: user=${user.username}, role=${user.role}`);
    return user;
  }
}
