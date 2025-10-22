import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from './entities/instance.entity';
import { InstanceActionLog, InstanceAction } from './entities/instance-action-log.entity';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { DockerService } from './docker.service';
import { InstanceStatus, UserRole } from '../common/enums';
import { CfgTemplate } from '../config-templates/entities/cfg-template.entity';
import { StartupOption } from '../config-templates/entities/startup-option.entity';
import { InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { promises as fs, Dirent, createReadStream } from 'fs';
import * as path from 'path';
import { Gamemode } from '../gamemodes/entities/gamemode.entity';
import archiver from 'archiver';

@Injectable()
export class InstancesService {
  constructor(
    @InjectRepository(Instance)
    private instancesRepository: Repository<Instance>,
    @InjectRepository(InstanceActionLog)
    private actionLogsRepository: Repository<InstanceActionLog>,
    @InjectRepository(CfgTemplate)
    private cfgTemplatesRepository: Repository<CfgTemplate>,
    @InjectRepository(StartupOption)
    private startupOptionsRepository: Repository<StartupOption>,
    @InjectRepository(Gamemode)
    private gamemodesRepository: Repository<Gamemode>,
    private dockerService: DockerService,
  ) { }

  private readonly hostInstancesRoot = process.env.GMOD_INSTANCE_ROOT || '/opt/gmodserver';
  private readonly gamemodeRoot = process.env.GMOD_GAMEMODE_ROOT || '/opt/allgamemodes';

  private sanitizeIdentifier(value: string | undefined, label: string): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException(`${label}不能为空`);
    }
    if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
      throw new BadRequestException(`${label}包含非法字符`);
    }
    return trimmed;
  }

  private async safeReaddir(targetPath: string): Promise<Dirent[]> {
    try {
      return await fs.readdir(targetPath, { withFileTypes: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return [];
      }
      throw new InternalServerErrorException(`读取目录失败: ${err.message}`);
    }
  }

  async listHostInstanceLinks(): Promise<
    Array<{
      name: string;
      path: string;
      isSymlink: boolean;
      linkedModeName: string | null;
      targetPath: string | null;
    }>
  > {
    const entries = await this.safeReaddir(this.hostInstancesRoot);
    const results: Array<{
      name: string;
      path: string;
      isSymlink: boolean;
      linkedModeName: string | null;
      targetPath: string | null;
    }> = [];
    const gamemodeRootResolved = path.resolve(this.gamemodeRoot);

    for (const entry of entries) {
      if (!(entry.isDirectory() || entry.isSymbolicLink())) {
        continue;
      }

      const fullPath = path.join(this.hostInstancesRoot, entry.name);
      try {
        const stat = await fs.lstat(fullPath);
        const isSymlink = stat.isSymbolicLink();
        let targetPath: string | null = null;
        let linkedModeName: string | null = null;

        if (isSymlink) {
          const rawTarget = await fs.readlink(fullPath);
          const resolvedTarget = path.isAbsolute(rawTarget)
            ? rawTarget
            : path.resolve(path.dirname(fullPath), rawTarget);
          targetPath = resolvedTarget;
          const absoluteTarget = path.resolve(resolvedTarget);
          if (absoluteTarget.startsWith(gamemodeRootResolved)) {
            const relative = path.relative(gamemodeRootResolved, absoluteTarget);
            linkedModeName = relative.split(path.sep)[0] || null;
          }
        }

        results.push({
          name: entry.name,
          path: fullPath,
          isSymlink,
          linkedModeName,
          targetPath,
        });
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw new InternalServerErrorException(`读取实例 ${entry.name} 状态失败: ${err.message}`);
      }
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listGamemodes(): Promise<Array<{ name: string; path: string }>> {
    const entries = await this.safeReaddir(this.gamemodeRoot);
    const results: Array<{ name: string; path: string }> = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = path.join(this.gamemodeRoot, entry.name);
      results.push({
        name: entry.name,
        path: fullPath,
      });
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async bindInstanceToGamemode(
    instanceName: string,
    modeName: string,
  ): Promise<{ instanceName: string; modeName: string; targetPath: string }> {
    const sanitizedInstance = this.sanitizeIdentifier(instanceName, '实例名称');
    const sanitizedMode = this.sanitizeIdentifier(modeName, '模式名称');

    const instancePath = path.join(this.hostInstancesRoot, sanitizedInstance);
    const modePath = path.join(this.gamemodeRoot, sanitizedMode);

    await fs.mkdir(this.hostInstancesRoot, { recursive: true });

    let modeStat;
    try {
      modeStat = await fs.stat(modePath);
    } catch {
      throw new NotFoundException(`模式目录不存在: ${sanitizedMode}`);
    }

    if (!modeStat.isDirectory()) {
      throw new ConflictException('目标模式不是有效的目录');
    }

    const instanceStat = await fs.lstat(instancePath).catch(() => null);
    if (instanceStat) {
      if (instanceStat.isSymbolicLink()) {
        await fs.unlink(instancePath);
      } else if (instanceStat.isDirectory()) {
        const contents = await fs.readdir(instancePath);
        if (contents.length > 0) {
          throw new ConflictException('实例目录非空，无法绑定为软链接');
        }
        await fs.rm(instancePath, { recursive: true });
      } else {
        throw new ConflictException('实例路径已存在且类型不受支持');
      }
    } else {
      await fs.mkdir(path.dirname(instancePath), { recursive: true });
    }

    await fs.symlink(modePath, instancePath);

    return {
      instanceName: sanitizedInstance,
      modeName: sanitizedMode,
      targetPath: modePath,
    };
  }

  async unbindInstanceLink(instanceName: string): Promise<{ instanceName: string }> {
    const sanitizedInstance = this.sanitizeIdentifier(instanceName, '实例名称');
    const instancePath = path.join(this.hostInstancesRoot, sanitizedInstance);

    const instanceStat = await fs.lstat(instancePath).catch(() => null);
    if (!instanceStat) {
      await fs.mkdir(instancePath, { recursive: true });
      return { instanceName: sanitizedInstance };
    }

    if (!instanceStat.isSymbolicLink()) {
      throw new ConflictException('该实例当前未绑定模式');
    }

    await fs.unlink(instancePath);
    await fs.mkdir(instancePath, { recursive: true });

    return { instanceName: sanitizedInstance };
  }

  async create(createInstanceDto: CreateInstanceDto): Promise<Instance> {
    // 检查实例名称是否重复
    const existingInstance = await this.instancesRepository.findOne({
      where: { name: createInstanceDto.name },
    });

    if (existingInstance) {
      throw new ConflictException('实例名称已存在');
    }

    // 如果指定了宿主机目录，先创建目录
    if (createInstanceDto.hostDirectory) {
      await this.dockerService.createHostDirectory(createInstanceDto.hostDirectory);
    }

    // 准备 Docker 容器配置（简化版：只配置目录挂载和启动命令）
    const dockerOptions: any = {};

    // 如果指定了挂载目录，添加到配置中
    const binds: string[] = [
      '/etc/localtime:/etc/localtime:ro',
      '/etc/timezone:/etc/timezone:ro',
    ];

    if (createInstanceDto.hostDirectory && createInstanceDto.containerDirectory) {
      binds.push(`${createInstanceDto.hostDirectory}:${createInstanceDto.containerDirectory}`);
    }

    dockerOptions.HostConfig = {
      Binds: binds,
    };

    // 设置 Docker 启动命令（默认下载 GMOD 4020）
    // 这个命令会在容器启动时执行，用于初始化环境
    const defaultDockerCmd = `

    `.trim();

    dockerOptions.Cmd = ['/bin/sh', '-c', defaultDockerCmd];

    // 创建 Docker 容器（只创建，不启动）
    const dockerId = await this.dockerService.createContainer(
      createInstanceDto.name,
      createInstanceDto.dockerImage, // 传递镜像名
      dockerOptions,
    );

    // 获取容器详细信息（包括分配的端口）
    const containerInfo = await this.dockerService.getContainerInfo(dockerId);

    const instance = this.instancesRepository.create({
      ...createInstanceDto,
      dockerId,
      containerName: `gmod_${createInstanceDto.name}`,
      status: InstanceStatus.STOPPED,
    });

    return this.instancesRepository.save(instance);
  }

  async findAll(userId?: number, userRole?: UserRole): Promise<Instance[]> {
    if (userRole === UserRole.SUPER_ADMIN) {
      return this.instancesRepository.find({ relations: ['admin'] });
    }

    return this.instancesRepository.find({
      where: { adminId: userId },
      relations: ['admin'],
    });
  }

  async findOne(id: number, userId?: number, userRole?: UserRole): Promise<any> {
    const instance = await this.instancesRepository.findOne({
      where: { id },
      relations: ['admin'],
    });

    if (!instance) {
      throw new NotFoundException('实例不存在');
    }

    // 普通管理员只能访问自己的实例
    if (userRole === UserRole.ADMIN && instance.adminId !== userId) {
      throw new ForbiddenException('无权访问此实例');
    }

    // 如果有 gamemodeId，获取 gamemode 名称
    let gamemodeName = null;
    if (instance.gamemodeId) {
      const gamemode = await this.gamemodesRepository.findOne({
        where: { id: instance.gamemodeId },
      });
      gamemodeName = gamemode?.name || null;
    }

    return {
      ...instance,
      gamemodeName,
    };
  }

  async update(id: number, updateInstanceDto: UpdateInstanceDto, userId?: number, userRole?: UserRole): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    // 权限检查
    if (userRole === UserRole.ADMIN) {
      // 普通管理员只能修改自己实例的 customCfg
      if (instance.adminId !== userId) {
        throw new ForbiddenException('无权修改此实例');
      }

      // 只允许修改 customCfg 字段
      const allowedFields = ['customCfg'];
      const requestedFields = Object.keys(updateInstanceDto);
      const unauthorizedFields = requestedFields.filter(field => !allowedFields.includes(field));

      if (unauthorizedFields.length > 0) {
        throw new ForbiddenException(`普通管理员只能修改 customCfg 字段，不能修改: ${unauthorizedFields.join(', ')}`);
      }
    }

    // 超级管理员的权限检查
    if (userRole === UserRole.SUPER_ADMIN) {
      if (updateInstanceDto.name && updateInstanceDto.name !== instance.name) {
        const existingInstance = await this.instancesRepository.findOne({
          where: { name: updateInstanceDto.name },
        });
        if (existingInstance) {
          throw new ConflictException('实例名称已存在');
        }
      }

      // 如果修改了挂载卷，需要重新创建容器
      if (updateInstanceDto.hostDirectory || updateInstanceDto.containerDirectory) {
        // 这里简化处理，实际应该先停止并删除旧容器
        instance.hostDirectory = updateInstanceDto.hostDirectory || instance.hostDirectory;
        instance.containerDirectory = updateInstanceDto.containerDirectory || instance.containerDirectory;
      }
    }

    Object.assign(instance, updateInstanceDto);
    const savedInstance = await this.instancesRepository.save(instance);

    // 如果设置了 CFG 模板或自定义 CFG，写入到容器
    if (instance.dockerId && (updateInstanceDto.cfgTemplateId !== undefined || updateInstanceDto.customCfg !== undefined)) {
      try {
        await this.writeCfgToContainer(savedInstance);
      } catch (error) {
        // 写入失败不影响实例更新，只记录错误
        console.error('写入 CFG 文件到容器失败:', error.message);
      }
    }

    return savedInstance;
  }

  private async writeCfgToContainer(instance: Instance): Promise<void> {
    // 生成 CFG 内容
    let cfgContent = '';

    // 如果有模板，先添加模板内容
    if (instance.cfgTemplateId) {
      const template = await this.cfgTemplatesRepository.findOne({
        where: { id: instance.cfgTemplateId },
      });
      if (template) {
        cfgContent += template.content + '\n\n';
      }
    }

    // 添加自定义内容
    if (instance.customCfg) {
      cfgContent += instance.customCfg;
    }

    // 如果有内容，写入到容器
    if (cfgContent.trim()) {
      const cfgFilePath = '/opt/steam/garrysmod/cfg/server.cfg';
      await this.dockerService.writeFileToContainer(instance.dockerId, cfgFilePath, cfgContent);
    }
  }

  async remove(id: number): Promise<void> {
    const instance = await this.findOne(id);

    if (instance.dockerId) {
      await this.dockerService.removeContainer(instance.dockerId);
    }

    // 删除实例数据
    await this.instancesRepository.remove(instance);

    // 删除宿主机目录
    if (instance.hostDirectory) {
      await this.dockerService.removeHostDirectory(instance.hostDirectory);
    }
  }

  async start(id: number, userId?: number, userRole?: UserRole): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    const startupArgs = await this.getStartupArgs(instance);
    if (!startupArgs) {
      throw new ConflictException('实例没有关联到启动项！');
    }

    await this.dockerService.writeFileToContainer(
      instance.dockerId,
      '/opt/steam/startup.args',
      startupArgs,
    );
    await this.dockerService.startContainer(instance.dockerId);
    instance.status = InstanceStatus.RUNNING;

    // 记录开机操作
    await this.actionLogsRepository.save({
      instanceId: instance.id,
      action: InstanceAction.START,
    });

    return this.instancesRepository.save(instance);
  }

  async stop(id: number, userId?: number, userRole?: UserRole): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    await this.dockerService.stopContainer(instance.dockerId);
    instance.status = InstanceStatus.STOPPED;

    // 记录关机操作
    await this.actionLogsRepository.save({
      instanceId: instance.id,
      action: InstanceAction.STOP,
    });

    return this.instancesRepository.save(instance);
  }

  async restart(id: number, userId?: number, userRole?: UserRole): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    instance.status = InstanceStatus.RESTARTING;
    await this.instancesRepository.save(instance);

    await this.dockerService.restartContainer(instance.dockerId);
    instance.status = InstanceStatus.RUNNING;

    return this.instancesRepository.save(instance);
  }

  async startServer(
    id: number,
    userId?: number,
    userRole?: UserRole,
  ): Promise<{ message: string }> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联到 Docker 容器');
    }

    await this.ensureContainerRunning(instance);

    const startupArgs = await this.getStartupArgs(instance);
    if (!startupArgs) {
      throw new ConflictException('实例没有关联到启动项！');
    }

    // 全局单服务器限制：检查是否已有其他服务器在运行
    const allInstances = await this.instancesRepository.find({
      where: { status: InstanceStatus.RUNNING },
    });

    for (const otherInstance of allInstances) {
      if (otherInstance.id === instance.id) {
        continue; // 跳过当前实例
      }

      if (!otherInstance.dockerId) {
        continue;
      }

      // 检查该实例的服务器是否在运行
      try {
        const result = await this.dockerService.execCommand(
          otherInstance.dockerId,
          'pgrep -f "srcds_run|srcds_linux" > /dev/null && echo "running" || echo "stopped"',
          { detach: false }
        );
        const isRunning = result.output?.trim().includes('running');
        if (isRunning) {
          throw new ConflictException(`无法启动服务器：实例 "${otherInstance.name}" 的服务器正在运行。系统同一时间只允许运行一个GMOD服务器。`);
        }
      } catch (error) {
        // 如果是我们抛出的 ConflictException，继续抛出
        if (error instanceof ConflictException) {
          throw error;
        }
        // 其他错误忽略，继续检查下一个
        continue;
      }
    }

    // 检查 screen 是否可用，如果没有则安装
    try {
      await this.dockerService.execCommand(instance.dockerId, 'which screen > /dev/null || (apt-get update && apt-get install -y screen)', {
        cwd: '/opt/steam/',
        detach: false,
      });
    } catch (error) {
      // 忽略错误，继续执行
    }

    // 使用 screen 会话以 gmod 用户运行服务器，并将输出重定向到容器主进程的 stdout
    // runuser 用于切换到 gmod 用户，避免 ROOT 警告
    // stdbuf -o0 禁用输出缓冲，确保实时显示所有控制台消息
    // /proc/1/fd/1 是容器主进程的标准输出
    const command = `runuser -u gmod -- bash -c 'cd /opt/steam && screen -dmS gmod bash -c "stdbuf -o0 ./srcds_run ${startupArgs} 2>&1 | stdbuf -o0 tee /proc/1/fd/1"'`;

    await this.dockerService.execCommand(instance.dockerId, command, {
      cwd: '/opt/steam/',
      detach: false,
    });

    return { message: '服务器启动命令已发送，请查看控制台输出面板查看启动日志' };
  }

  async stopServer(
    id: number,
    userId?: number,
    userRole?: UserRole,
  ): Promise<{ message: string }> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联到 Docker 容器');
    }

    await this.ensureContainerRunning(instance);

    // 由于服务器运行在 gmod 用户下，需要以 gmod 用户执行停止命令
    const stopCommand = [
      'runuser -u gmod -- screen -S gmod -X quit 2>/dev/null || true',
      'pkill -u gmod -f srcds_linux >/dev/null 2>&1 || true',
      'pkill -u gmod -f srcds_run >/dev/null 2>&1 || true',
      'pkill -u gmod -f "tee /proc/1/fd/1" >/dev/null 2>&1 || true',
    ].join('; ');

    const result = await this.dockerService.execCommand(instance.dockerId, stopCommand, {
      cwd: '/opt/steam',
    });

    const message = result.output?.trim() || '服务器已停止';
    return { message };
  }

  async restartServer(
    id: number,
    userId?: number,
    userRole?: UserRole,
  ): Promise<{ message: string }> {
    await this.stopServer(id, userId, userRole);
    await this.delay(2000);
    await this.startServer(id, userId, userRole);

    return { message: '服务器重启命令已发送' };
  }
  async getLogs(
    id: number,
    userId?: number,
    userRole?: UserRole,
    since?: number,
  ): Promise<{ logs: string; cursor: number | null }> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    // 获取最近两次操作记录（一次开机和一次关机）
    const recentActionLogs = await this.actionLogsRepository.find({
      where: { instanceId: instance.id },
      order: { createdAt: 'DESC' },
      take: 2,
    });

    // 尝试获取容器日志
    let containerLogs = '';
    let cursor: number | null = null;

    try {
      const result = await this.dockerService.getContainerLogs(instance.dockerId, { since });
      containerLogs = result.logs;
      cursor = result.cursor;
    } catch (error) {
      // 容器可能已停止，无法获取日志，仅返回操作历史
      console.log(`获取容器日志失败 (实例 ${id}):`, error.message);
    }

    // 构建日志标记
    let logHeader = '';
    if (recentActionLogs.length > 0) {
      // 如果最近的操作是 START，显示开机标记
      if (recentActionLogs[0].action === InstanceAction.START) {
        const startTime = new Date(recentActionLogs[0].createdAt).toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour12: false
        });
        logHeader = `========== 实例已开机 (${startTime}) ==========\n\n`;
      }
      // 如果最近的操作是 STOP，显示关机标记，并且如果之前有开机记录也显示
      else if (recentActionLogs[0].action === InstanceAction.STOP) {
        const stopTime = new Date(recentActionLogs[0].createdAt).toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour12: false
        });

        // 如果有上一次的开机记录，先显示开机，再显示关机
        if (recentActionLogs.length > 1 && recentActionLogs[1].action === InstanceAction.START) {
          const startTime = new Date(recentActionLogs[1].createdAt).toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            hour12: false
          });
          logHeader = `========== 实例已开机 (${startTime}) ==========\n\n`;
        }

        // 在日志末尾添加关机标记（如果有容器日志的话）
        if (containerLogs) {
          containerLogs += `\n\n========== 实例已停止 (${stopTime}) ==========`;
        } else {
          logHeader += `========== 实例已停止 (${stopTime}) ==========\n\n`;
        }
      }
    }

    return {
      logs: logHeader + containerLogs,
      cursor,
    };
  }

  async getMyInstances(userId: number): Promise<Instance[]> {
    return this.instancesRepository.find({
      where: { adminId: userId },
      relations: ['admin'],
    });
  }

  async getInstanceInfo(id: number, userId?: number, userRole?: UserRole): Promise<any> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    const containerInfo = await this.dockerService.getContainerInfo(instance.dockerId);

    // 检查 GMOD 服务器进程是否在运行
    let isServerRunning = false;
    if (instance.status === InstanceStatus.RUNNING) {
      try {
        const result = await this.dockerService.execCommand(
          instance.dockerId,
          'pgrep -f "srcds_run|srcds_linux" > /dev/null && echo "running" || echo "stopped"',
          { detach: false }
        );
        isServerRunning = result.output?.trim().includes('running');
      } catch (error) {
        // 如果执行失败，认为服务器未运行
        isServerRunning = false;
      }
    }

    return {
      ...instance,
      containerInfo,
      isServerRunning,
    };
  }

  async execCommand(id: number, command: string, userId?: number, userRole?: UserRole): Promise<any> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    // 检查容器是否在运行
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new ConflictException('容器未运行，无法执行命令');
    }

    // 检查服务器进程是否在运行
    try {
      const result = await this.dockerService.execCommand(
        instance.dockerId,
        'pgrep -f "srcds_run|srcds_linux" > /dev/null && echo "running" || echo "stopped"',
        { detach: false }
      );
      const isServerRunning = result.output?.trim().includes('running');
      if (!isServerRunning) {
        throw new ConflictException('GMOD服务器未运行，无法发送命令');
      }
    } catch (error) {
      throw new ConflictException('无法检测服务器状态');
    }

    // 通过RCON发送命令到GMOD服务器
    // 使用 screen 发送命令到 srcds_run 进程
    // 由于 screen 会话运行在 gmod 用户下，需要以 gmod 用户执行命令
    const screenCommand = `runuser -u gmod -- screen -S gmod -X stuff "${command.replace(/"/g, '\\"')}^M"`;

    try {
      await this.dockerService.execCommand(instance.dockerId, screenCommand, {
        cwd: '/opt/steam',
        detach: false,
      });

      return { output: `RCON命令已发送: ${command}` };
    } catch (error) {
      throw new ConflictException(`发送RCON命令失败: ${error.message}`);
    }
  }
  private async ensureContainerRunning(instance: Instance): Promise<void> {
    const status = await this.dockerService.getContainerStatus(instance.dockerId!);
    if ((status || '').toLowerCase() !== 'running') {
      throw new ConflictException('容器未运行，无法执行该操作');
    }
  }

  private async getStartupArgs(instance: Instance): Promise<string> {
    if (!instance.startupOptionId) {
      return '';
    }

    const option = await this.startupOptionsRepository.findOne({
      where: { id: instance.startupOptionId },
    });

    return this.normalizeStartupArgs(option?.content);
  }

  private normalizeStartupArgs(content?: string): string {
    if (!content) {
      return '';
    }

    return content
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 文件管理相关方法
  private async checkPermission(instanceId: number, userId: number, userRole: UserRole): Promise<void> {
    const instance = await this.instancesRepository.findOne({ where: { id: instanceId } });
    if (!instance) {
      throw new NotFoundException('实例不存在');
    }

    // 普通管理员只能访问自己的实例
    if (userRole === UserRole.ADMIN && instance.adminId !== userId) {
      throw new ForbiddenException('无权访问此实例');
    }
  }

  private async getGamemodeBuildDir(instanceId: number): Promise<string> {
    const instance = await this.instancesRepository.findOne({ where: { id: instanceId } });
    if (!instance) {
      throw new NotFoundException('实例不存在');
    }

    if (!instance.gamemodeId) {
      throw new BadRequestException('实例未绑定模式');
    }

    const gamemode = await this.gamemodesRepository.findOne({ where: { id: instance.gamemodeId } });
    if (!gamemode) {
      throw new NotFoundException('模式不存在');
    }

    return gamemode.buildDir;
  }

  private sanitizePath(inputPath: string): string {
    const normalized = path.normalize(inputPath).replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized.includes('..')) {
      throw new BadRequestException('路径包含非法字符');
    }
    return normalized;
  }

  async listFiles(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const buildDir = await this.getGamemodeBuildDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(buildDir, sanitizedPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(fullPath, entry.name);
          const stats = await fs.stat(entryPath);
          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modifiedAt: stats.mtime,
          };
        })
      );
      return { files, currentPath: sanitizedPath };
    } catch (error) {
      throw new InternalServerErrorException('读取目录失败: ' + error.message);
    }
  }

  async uploadFile(
    instanceId: number,
    relativePath: string,
    file: any,
    userId: number,
    userRole: UserRole
  ) {
    await this.checkPermission(instanceId, userId, userRole);

    if (!file || !file.buffer) {
      throw new BadRequestException('文件内容为空');
    }

    // 检查文件大小限制 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const buildDir = await this.getGamemodeBuildDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const targetDir = path.join(buildDir, sanitizedPath);
    const targetPath = path.join(targetDir, file.originalname);

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, file.buffer);
      return { message: '文件上传成功', filename: file.originalname };
    } catch (error) {
      throw new InternalServerErrorException('文件上传失败: ' + error.message);
    }
  }

  async uploadFileToFolder(
    instanceId: number,
    basePath: string,
    fileRelativePath: string,
    file: any,
    userId: number,
    userRole: UserRole
  ) {
    await this.checkPermission(instanceId, userId, userRole);

    if (!file || !file.buffer) {
      throw new BadRequestException('文件内容为空');
    }

    // 检查文件大小限制 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const buildDir = await this.getGamemodeBuildDir(instanceId);
    const sanitizedBasePath = this.sanitizePath(basePath);
    const sanitizedRelativePath = this.sanitizePath(fileRelativePath);

    // 组合完整路径
    const fullRelativePath = path.join(sanitizedBasePath, sanitizedRelativePath);
    const targetPath = path.join(buildDir, fullRelativePath);
    const targetDir = path.dirname(targetPath);

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, file.buffer);
      return { message: '文件上传成功', filename: path.basename(targetPath) };
    } catch (error) {
      throw new InternalServerErrorException('文件上传失败: ' + error.message);
    }
  }

  async downloadFile(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const buildDir = await this.getGamemodeBuildDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(buildDir, sanitizedPath);

    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        throw new BadRequestException('不能下载目录，请使用文件夹下载功能');
      }

      const filename = path.basename(fullPath);
      const stream = createReadStream(fullPath);
      return { stream, filename };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException('文件不存在');
      }
      throw new InternalServerErrorException('文件下载失败: ' + error.message);
    }
  }

  async downloadFolder(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const buildDir = await this.getGamemodeBuildDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(buildDir, sanitizedPath);

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        throw new BadRequestException('只能打包下载目录');
      }

      const folderName = path.basename(fullPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      // 添加整个目录到压缩包
      archive.directory(fullPath, false);
      archive.finalize();

      return { stream: archive, filename: `${folderName}.zip` };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException('文件夹不存在');
      }
      throw new InternalServerErrorException('文件夹下载失败: ' + error.message);
    }
  }

  async downloadMultiple(instanceId: number, paths: string[], userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const buildDir = await this.getGamemodeBuildDir(instanceId);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    try {
      for (const relativePath of paths) {
        const sanitizedPath = this.sanitizePath(relativePath);
        const fullPath = path.join(buildDir, sanitizedPath);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          archive.directory(fullPath, path.basename(fullPath));
        } else {
          archive.file(fullPath, { name: path.basename(fullPath) });
        }
      }

      archive.finalize();
      return { stream: archive, filename: 'files.zip' };
    } catch (error) {
      throw new InternalServerErrorException('批量下载失败: ' + error.message);
    }
  }

  async deleteFile(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const buildDir = await this.getGamemodeBuildDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(buildDir, sanitizedPath);

    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
      return { message: '删除成功' };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException('文件不存在');
      }
      throw new InternalServerErrorException('删除失败: ' + error.message);
    }
  }
}










