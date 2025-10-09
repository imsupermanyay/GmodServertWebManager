import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Repo } from '../entities/repo.entity';
import { CreateRepoDto } from './dto/create-repo.dto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class ReposService {
  // Git 仓库存储路径
  private readonly GIT_REPOS_PATH = process.env.GIT_REPOS_PATH || '/var/gmod/repos';

  constructor(
    @InjectRepository(Repo)
    private repoRepository: Repository<Repo>,
  ) {}

  /**
   * 获取所有仓库列表
   */
  async findAll(): Promise<Repo[]> {
    return this.repoRepository.find({
      relations: ['bindings'],
    });
  }

  /**
   * 获取单个仓库详情
   */
  async findOne(id: number): Promise<Repo> {
    const repo = await this.repoRepository.findOne({
      where: { id },
      relations: ['bindings', 'webhook_secret'],
    });

    if (!repo) {
      throw new NotFoundException(`仓库 ID ${id} 不存在`);
    }

    return repo;
  }

  /**
   * 创建新仓库 (clone --bare)
   */
  async create(data: CreateRepoDto): Promise<Repo> {
    // 检查仓库名称是否已存在
    const existing = await this.repoRepository.findOne({
      where: { name: data.name },
    });

    if (existing) {
      throw new BadRequestException(`仓库名称 ${data.name} 已存在`);
    }

    // 创建数据库记录
    const repo = this.repoRepository.create(data);
    const savedRepo = await this.repoRepository.save(repo);

    // 克隆 bare 仓库
    try {
      await this.cloneBareRepo(savedRepo.gitea_http_url, savedRepo.name);
    } catch (error) {
      // 如果克隆失败,删除数据库记录
      await this.repoRepository.remove(savedRepo);
      throw new BadRequestException(`克隆仓库失败: ${error.message}`);
    }

    return savedRepo;
  }

  /**
   * 更新仓库信息
   */
  async update(id: number, data: Partial<Repo>): Promise<Repo> {
    const repo = await this.findOne(id);

    // 合并更新数据
    Object.assign(repo, data);

    return this.repoRepository.save(repo);
  }

  /**
   * 删除仓库
   */
  async remove(id: number): Promise<void> {
    const repo = await this.findOne(id);

    // 删除本地 bare 仓库
    const repoPath = path.join(this.GIT_REPOS_PATH, `${repo.name}.git`);
    if (fs.existsSync(repoPath)) {
      await execAsync(`rm -rf "${repoPath}"`);
    }

    await this.repoRepository.remove(repo);
  }

  /**
   * 克隆 bare 仓库
   */
  private async cloneBareRepo(gitUrl: string, repoName: string): Promise<void> {
    // 确保存储目录存在
    if (!fs.existsSync(this.GIT_REPOS_PATH)) {
      fs.mkdirSync(this.GIT_REPOS_PATH, { recursive: true });
    }

    const repoPath = path.join(this.GIT_REPOS_PATH, `${repoName}.git`);

    // 检查目录是否已存在
    if (fs.existsSync(repoPath)) {
      throw new Error(`仓库目录 ${repoPath} 已存在`);
    }

    // 执行 git clone --bare
    const command = `git clone --bare "${gitUrl}" "${repoPath}"`;
    await execAsync(command);
  }

  /**
   * 同步仓库 (git fetch)
   */
  async syncRepo(id: number): Promise<void> {
    const repo = await this.findOne(id);
    const repoPath = path.join(this.GIT_REPOS_PATH, `${repo.name}.git`);

    if (!fs.existsSync(repoPath)) {
      throw new NotFoundException(`仓库目录 ${repoPath} 不存在`);
    }

    // 执行 git fetch
    const command = `git -C "${repoPath}" fetch --all --prune`;
    await execAsync(command);
  }

  /**
   * 获取仓库所有分支
   */
  async getBranches(id: number): Promise<string[]> {
    const repo = await this.findOne(id);
    const repoPath = path.join(this.GIT_REPOS_PATH, `${repo.name}.git`);

    if (!fs.existsSync(repoPath)) {
      throw new NotFoundException(`仓库目录 ${repoPath} 不存在`);
    }

    // 获取所有分支
    const { stdout } = await execAsync(
      `git -C "${repoPath}" branch -r | sed 's/origin\\///' | sed 's/^[[:space:]]*//'`,
    );

    return stdout
      .split('\n')
      .filter((branch) => branch.trim() && !branch.includes('HEAD'));
  }

  /**
   * 获取仓库路径
   */
  getRepoPath(repoName: string): string {
    return path.join(this.GIT_REPOS_PATH, `${repoName}.git`);
  }
}
