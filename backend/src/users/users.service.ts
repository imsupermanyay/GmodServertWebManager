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
  ) { }

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
    try {
      this.logger.log('开始检查超级管理员账号...');

      // 先查询是否已存在超级管理员
      const existingSuperAdmin = await this.usersRepository.findOne({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (existingSuperAdmin) {
        this.logger.log(`✅ 超级管理员账号已存在: ${existingSuperAdmin.username} (ID: ${existingSuperAdmin.id})`);
        return;
      }

      // 获取配置
      const username = process.env.SUPER_ADMIN_USERNAME;
      const password = process.env.SUPER_ADMIN_PASSWORD;


      this.logger.log(`准备创建超级管理员账号: ${username}`);
      this.logger.log(`密码长度: ${password.length}`);

      // 检查用户名是否已被占用
      const existingUser = await this.usersRepository.findOne({
        where: { username },
      });

      if (existingUser) {
        this.logger.warn(`用户名 ${username} 已存在，更新为超级管理员`);
        existingUser.role = UserRole.SUPER_ADMIN;
        existingUser.password = await bcrypt.hash(password, 10);
        existingUser.isActive = true;
        await this.usersRepository.save(existingUser);
        this.logger.log(`✅ 已将用户 ${username} 更新为超级管理员`);
        return;
      }

      // 生成密码哈希
      const hashedPassword = await bcrypt.hash(password, 10);
      this.logger.log(`密码哈希生成成功，长度: ${hashedPassword.length}`);

      // 创建新的超级管理员
      const admin = this.usersRepository.create({
        username: username,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });

      this.logger.log(`准备保存超级管理员到数据库...`);
      this.logger.log(`用户对象: username=${admin.username}, role=${admin.role}, isActive=${admin.isActive}, password length=${admin.password?.length || 0}`);

      const savedAdmin = await this.usersRepository.save(admin);

      this.logger.log(`✅ 超级管理员账号创建成功!`);
      this.logger.log(`   ID: ${savedAdmin.id}`);
      this.logger.log(`   用户名: ${savedAdmin.username}`);
      this.logger.log(`   角色: ${savedAdmin.role}`);
      this.logger.log(`   状态: ${savedAdmin.isActive ? '激活' : '未激活'}`);

      // 验证创建结果
      const verifyAdmin = await this.usersRepository.findOne({
        where: { id: savedAdmin.id },
      });

      if (verifyAdmin && verifyAdmin.username && verifyAdmin.password) {
        this.logger.log(`✅ 验证成功：超级管理员数据完整`);
      } else {
        this.logger.error(`❌ 验证失败：超级管理员数据不完整`);
        this.logger.error(`   username: ${verifyAdmin?.username || 'NULL'}`);
        this.logger.error(`   password: ${verifyAdmin?.password ? '已设置' : 'NULL'}`);
      }
    } catch (error) {
      this.logger.error(`❌ 创建超级管理员失败: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }
}
