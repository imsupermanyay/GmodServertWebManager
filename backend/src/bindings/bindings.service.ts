import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Binding } from '../entities/binding.entity';
import { Repo } from '../entities/repo.entity';
import { Instance } from '../entities/instance.entity';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class BindingsService {
  // Git worktree 存储路径
  private readonly WORKTREE_PATH = process.env.WORKTREE_PATH || '/var/gmod/worktrees';
  // 实例 addon 目录路径
  private readonly INSTANCE_ADDON_PATH = process.env.INSTANCE_ADDON_PATH || '/var/gmod/instances';
  // Git 仓库路径
  private readonly GIT_REPOS_PATH = process.env.GIT_REPOS_PATH || '/var/gmod/repos';

  constructor(
    @InjectRepository(Binding)
    private bindingRepository: Repository<Binding>,
    @InjectRepository(Repo)
    private repoRepository: Repository<Repo>,
    @InjectRepository(Instance)
    private instanceRepository: Repository<Instance>,
  ) {}

  /**
   * 获取所有绑定列表 (根据用户角色过滤)
   */
  async findAll(userId: number, userRole: UserRole): Promise<Binding[]> {
    if (userRole === UserRole.SUPER_ADMIN) {
      return this.bindingRepository.find({
        relations: ['repo', 'instance', 'instance.owner'],
      });
    } else {
      // 普通管理员只能查看自己实例的绑定
      return this.bindingRepository
        .createQueryBuilder('binding')
        .leftJoinAndSelect('binding.repo', 'repo')
        .leftJoinAndSelect('binding.instance', 'instance')
        .leftJoinAndSelect('instance.owner', 'owner')
        .where('instance.owner_user_id = :userId', { userId })
        .getMany();
    }
  }

  /**
   * 获取单个绑定详情
   */
  async findOne(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Binding> {
    const binding = await this.bindingRepository.findOne({
      where: { id },
      relations: ['repo', 'instance', 'instance.owner'],
    });

    if (!binding) {
      throw new NotFoundException(`绑定 ID ${id} 不存在`);
    }

    // 权限检查:普通管理员只能访问自己实例的绑定
    if (
      userRole !== UserRole.SUPER_ADMIN &&
      binding.instance.owner_user_id !== userId
    ) {
      throw new ForbiddenException('无权访问此绑定');
    }

    return binding;
  }

  /**
   * 创建新绑定 (git worktree add + ln -sfn)
   */
  async create(
    data: CreateBindingDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Binding> {
    // 检查 repo 是否存在
    const repo = await this.repoRepository.findOne({
      where: { id: data.repo_id },
    });
    if (!repo) {
      throw new NotFoundException(`仓库 ID ${data.repo_id} 不存在`);
    }

    // 检查 instance 是否存在
    const instance = await this.instanceRepository.findOne({
      where: { id: data.instance_id },
    });
    if (!instance) {
      throw new NotFoundException(`实例 ID ${data.instance_id} 不存在`);
    }

    // 权限检查:普通管理员只能绑定自己的实例
    if (
      userRole !== UserRole.SUPER_ADMIN &&
      instance.owner_user_id !== userId
    ) {
      throw new ForbiddenException('无权绑定此实例');
    }

    // 检查是否已存在相同的绑定
    const existing = await this.bindingRepository.findOne({
      where: {
        repo_id: data.repo_id,
        branch: data.branch,
        instance_id: data.instance_id,
      },
    });

    if (existing) {
      throw new BadRequestException('此绑定已存在');
    }

    // 创建数据库记录
    const binding = this.bindingRepository.create(data);
    const savedBinding = await this.bindingRepository.save(binding);

    // 创建 worktree 和软链接
    try {
      await this.setupWorktreeAndLink(repo, instance, data.branch);
    } catch (error) {
      // 如果失败,删除数据库记录
      await this.bindingRepository.remove(savedBinding);
      throw new BadRequestException(
        `创建 worktree 或软链接失败: ${error.message}`,
      );
    }

    return this.bindingRepository.findOne({
      where: { id: savedBinding.id },
      relations: ['repo', 'instance'],
    });
  }

  /**
   * 更新绑定状态
   */
  async update(
    id: number,
    enabled: boolean,
    userId: number,
    userRole: UserRole,
  ): Promise<Binding> {
    const binding = await this.findOne(id, userId, userRole);

    binding.enabled = enabled;

    return this.bindingRepository.save(binding);
  }

  /**
   * 删除绑定 (同时删除 worktree 和软链接)
   */
  async remove(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const binding = await this.findOne(id, userId, userRole);

    // 删除软链接
    const linkPath = this.getLinkPath(
      binding.instance.docker_container_name,
      binding.repo.name,
    );
    if (fs.existsSync(linkPath)) {
      await execAsync(`rm -f "${linkPath}"`);
    }

    // 删除 worktree
    const worktreePath = this.getWorktreePath(
      binding.repo.name,
      binding.instance.docker_container_name,
      binding.branch,
    );
    if (fs.existsSync(worktreePath)) {
      const repoPath = path.join(this.GIT_REPOS_PATH, `${binding.repo.name}.git`);
      await execAsync(
        `git -C "${repoPath}" worktree remove "${worktreePath}" --force`,
      );
    }

    await this.bindingRepository.remove(binding);
  }

  /**
   * 刷新绑定 (重新创建软链接)
   */
  async refresh(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const binding = await this.findOne(id, userId, userRole);

    const worktreePath = this.getWorktreePath(
      binding.repo.name,
      binding.instance.docker_container_name,
      binding.branch,
    );
    const linkPath = this.getLinkPath(
      binding.instance.docker_container_name,
      binding.repo.name,
    );

    // 删除旧软链接
    if (fs.existsSync(linkPath)) {
      await execAsync(`rm -f "${linkPath}"`);
    }

    // 创建新软链接
    await execAsync(`ln -sfn "${worktreePath}" "${linkPath}"`);
  }

  /**
   * 设置 worktree 和软链接
   */
  private async setupWorktreeAndLink(
    repo: Repo,
    instance: Instance,
    branch: string,
  ): Promise<void> {
    const repoPath = path.join(this.GIT_REPOS_PATH, `${repo.name}.git`);
    const worktreePath = this.getWorktreePath(
      repo.name,
      instance.docker_container_name,
      branch,
    );
    const linkPath = this.getLinkPath(instance.docker_container_name, repo.name);

    // 确保 worktree 目录存在
    const worktreeBaseDir = path.join(
      this.WORKTREE_PATH,
      repo.name,
      instance.docker_container_name,
    );
    if (!fs.existsSync(worktreeBaseDir)) {
      fs.mkdirSync(worktreeBaseDir, { recursive: true });
    }

    // 检查 worktree 是否已存在
    if (fs.existsSync(worktreePath)) {
      throw new Error(`Worktree 目录 ${worktreePath} 已存在`);
    }

    // 创建 worktree
    const worktreeCommand = `git -C "${repoPath}" worktree add "${worktreePath}" "${branch}"`;
    await execAsync(worktreeCommand);

    // 确保实例 addon 目录存在
    const instanceAddonDir = path.join(
      this.INSTANCE_ADDON_PATH,
      instance.docker_container_name,
      'addons',
    );
    if (!fs.existsSync(instanceAddonDir)) {
      fs.mkdirSync(instanceAddonDir, { recursive: true });
    }

    // 创建软链接
    const linkCommand = `ln -sfn "${worktreePath}" "${linkPath}"`;
    await execAsync(linkCommand);
  }

  /**
   * 获取 worktree 路径
   */
  private getWorktreePath(
    repoName: string,
    containerName: string,
    branch: string,
  ): string {
    return path.join(
      this.WORKTREE_PATH,
      repoName,
      containerName,
      branch,
    );
  }

  /**
   * 获取软链接路径
   */
  private getLinkPath(containerName: string, repoName: string): string {
    return path.join(
      this.INSTANCE_ADDON_PATH,
      containerName,
      'addons',
      repoName,
    );
  }

  /**
   * 同步 worktree (git pull)
   */
  async syncWorktree(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const binding = await this.findOne(id, userId, userRole);

    const worktreePath = this.getWorktreePath(
      binding.repo.name,
      binding.instance.docker_container_name,
      binding.branch,
    );

    if (!fs.existsSync(worktreePath)) {
      throw new NotFoundException(`Worktree 目录 ${worktreePath} 不存在`);
    }

    // 执行 git pull
    const command = `git -C "${worktreePath}" pull origin ${binding.branch}`;
    await execAsync(command);
  }
}
