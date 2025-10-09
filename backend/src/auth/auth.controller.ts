import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Session,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 登录接口
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Session() session: any) {
    const user = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );

    // 将用户信息存储到 session
    session.user = user;

    return {
      success: true,
      message: '登录成功',
      data: user,
    };
  }

  /**
   * 登出接口
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Session() session: any) {
    session.destroy();
    return {
      success: true,
      message: '登出成功',
    };
  }

  /**
   * 获取当前用户信息
   */
  @Post('me')
  async getCurrentUser(@Session() session: any) {
    if (!session.user) {
      return {
        success: false,
        message: '未登录',
      };
    }

    return {
      success: true,
      data: session.user,
    };
  }
}
