import { Controller, Post, Body, HttpCode, HttpStatus, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }) {
    this.logger.log(`收到登录请求: username=${body.username}`);

    try {
      // 验证用户
      const user = await this.authService.validateUser(body.username, body.password);

      // 生成 JWT token
      const result = await this.authService.login(user);

      this.logger.log(`✅ 用户 ${body.username} 登录成功，已颁发 JWT token`);

      return result;
    } catch (error) {
      this.logger.error(`❌ 登录失败: ${error.message}`);
      throw error;
    }
  }
}
