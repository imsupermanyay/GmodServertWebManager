import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    this.logger.log(`开始验证用户: ${username}`);

    try {
      this.logger.log('查询数据库...');
      const user = await this.usersService.findByUsername(username);
      this.logger.log(`数据库查询完成，找到用户: ${user ? '是' : '否'}`);

      if (!user) {
        this.logger.warn('用户不存在');
        throw new UnauthorizedException('用户名或密码错误');
      }

      this.logger.log(`检查用户状态: ${user.isActive ? '激活' : '禁用'}`);
      if (!user.isActive) {
        throw new UnauthorizedException('账号已被禁用');
      }

      this.logger.log('验证密码...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      this.logger.log(`密码验证结果: ${isPasswordValid ? '正确' : '错误'}`);

      if (!isPasswordValid) {
        throw new UnauthorizedException('用户名或密码错误');
      }

      const { password: _, ...result } = user;
      this.logger.log('用户验证成功');
      return result;
    } catch (error) {
      this.logger.error(`验证过程出错: ${error.message}`);
      throw error;
    }
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

}
