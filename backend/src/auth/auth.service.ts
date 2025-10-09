import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 验证用户密码
   */
  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username, is_active: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return user;
  }

  /**
   * 登录
   */
  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * 初始化默认管理员账户
   */
  async initDefaultAdmin() {
    const existingAdmin = await this.userRepository.findOne({
      where: { username: 'admin' },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = this.userRepository.create({
        username: 'admin',
        email: 'admin@gmod.local',
        password_hash: hashedPassword,
        role: 'SUPER_ADMIN',
        is_active: true,
      });
      await this.userRepository.save(admin);
      console.log('✅ 默认管理员账户已创建: admin / admin123');
    }
  }
}
