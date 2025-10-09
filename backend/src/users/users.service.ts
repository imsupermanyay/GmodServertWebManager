import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'username', 'email', 'role', 'is_active', 'created_at'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'role', 'is_active', 'created_at'],
    });
    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }
    return user;
  }

  async create(data: Partial<User>): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password_hash || 'password', 10);
    const user = this.userRepository.create({
      ...data,
      password_hash: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    await this.findOne(id);
    if (data.password_hash) {
      data.password_hash = await bcrypt.hash(data.password_hash, 10);
    }
    await this.userRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}
