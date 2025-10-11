import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Session,
  UnauthorizedException,
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
      message: '登录成功',
      user,
    };
  }

  /**
   * 登出接口
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Session() session: any) {
    session.destroy?.();
    return {
      message: '登出成功',
    };
  }

  /**
   * 获取当前用户信息
   */
  @Get('me')
  async getCurrentUser(@Session() session: any) {
    if (!session.user) {
      throw new UnauthorizedException('未登录');
    }

    return {
      user: session.user,
    };
  }
}
