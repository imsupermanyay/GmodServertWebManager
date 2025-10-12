import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  private readonly logger = new Logger(BasicAuthGuard.name);

  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.log(`Basic Auth 检查: ${request.method} ${request.url}`);

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      this.logger.warn('未提供 Basic Auth 凭证');
      throw new UnauthorizedException('需要提供认证信息');
    }

    try {
      // 解析 Basic Auth
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      this.logger.log(`尝试验证用户: ${username}`);

      // 验证用户名和密码
      const user = await this.authService.validateUser(username, password);

      // 将用户信息附加到请求对象
      request.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
      };

      this.logger.log(`✅ 认证成功: ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ 认证失败: ${error.message}`);
      throw new UnauthorizedException('用户名或密码错误');
    }
  }
}
