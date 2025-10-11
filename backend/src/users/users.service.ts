import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || UserRole.ADMIN,
    });

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['instances'],
      select: ['id', 'username', 'role', 'isActive', 'createdAt'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['instances'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    this.logger.log(`查询用户: ${username}`);
    try {
      const user = await this.usersRepository.findOne({ where: { username } });
      this.logger.log(`查询结果: ${user ? `找到用户 ID=${user.id}` : '用户不存在'}`);
      return user;
    } catch (error) {
      this.logger.error(`查询用户失败: ${error.message}`);
      throw error;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.username) {
      const existingUser = await this.usersRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('用户名已存在');
      }
      user.username = updateUserDto.username;
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ConflictException('不能删除超级管理员账号');
    }
    await this.usersRepository.remove(user);
  }

  async createSuperAdmin(): Promise<void> {
    const superAdmin = await this.usersRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash(
        process.env.SUPER_ADMIN_PASSWORD || 'admin123',
        10,
      );
      const admin = this.usersRepository.create({
        username: process.env.SUPER_ADMIN_USERNAME || 'admin',
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
      });
      await this.usersRepository.save(admin);
      console.log('超级管理员账号已创建');
    }
  }
}
