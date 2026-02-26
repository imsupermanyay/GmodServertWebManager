import { Injectable, NotFoundException, ConflictException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from './entities/instance.entity';
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
export class InstancesService implements OnModuleInit {
  constructor(
    @InjectRepository(Instance)
    private instancesRepository: Repository<Instance>,
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
  private readonly dataRoot = process.env.GMOD_DATA_ROOT || '/opt/allserverdata';
  private readonly binRoot = process.env.GMOD_BIN_ROOT || '/opt/gmodbin';

  async onModuleInit(): Promise<void> {
    try {
      await fs.mkdir(this.binRoot, { recursive: true });
      console.log(`[初始化] Bin 目录已就绪: ${this.binRoot}`);
    } catch (error) {
      console.error(`[初始化] 创建 Bin 目录失败: ${(error as Error).message}`);
    }
  }

  async listBinDirectories(): Promise<string[]> {
    const entries = await this.safeReaddir(this.binRoot);
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
  }

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
    console.log('[创建实例] 开始，参数:', JSON.stringify(createInstanceDto));

    // 检查实例名称是否重复
    const existingInstance = await this.instancesRepository.findOne({
      where: { name: createInstanceDto.name },
    });

    if (existingInstance) {
      throw new ConflictException('实例名称已存在');
    }

    // 如果指定了宿主机目录，先创建目录
    if (createInstanceDto.hostDirectory) {
      console.log('[创建实例] 创建宿主机目录:', createInstanceDto.hostDirectory);
      await this.dockerService.createHostDirectory(createInstanceDto.hostDirectory);
    }

    // 创建数据目录 (每个实例都需要)
    const dataHostDir = path.join(this.dataRoot, `${createInstanceDto.name}_data`);
    console.log('[创建实例] 创建数据目录:', dataHostDir);
    await this.dockerService.createHostDirectory(dataHostDir);

    // 准备 Docker 容器配置（简化版：只配置目录挂载和启动命令）
    const dockerOptions: any = {};

    // 如果指定了挂载目录，添加到配置中
    const binds: string[] = [
      '/etc/localtime:/etc/localtime:ro',
      '/etc/timezone:/etc/timezone:ro',
      // 挂载数据目录 (固定挂载到 /opt/steam/garrysmod/data)
      `${dataHostDir}:/opt/steam/garrysmod/data`,
    ];

    if (createInstanceDto.hostDirectory && createInstanceDto.containerDirectory) {
      binds.push(`${createInstanceDto.hostDirectory}:${createInstanceDto.containerDirectory}`);
    }

    // 挂载 bin 目录 (mysqloo 等二进制模块)
    if (createInstanceDto.binHostDirectory) {
      const binFullPath = path.join(this.binRoot, createInstanceDto.binHostDirectory);
      await this.dockerService.createHostDirectory(binFullPath);
      binds.push(`${binFullPath}:/opt/steam/garrysmod/lua/bin`);
    }

    dockerOptions.HostConfig = {
      Binds: binds,
    };

    // 如果没有指定端口，自动分配
    if (!createInstanceDto.port) {
      const allocatedPort = await this.allocatePort();
      createInstanceDto.port = allocatedPort;
      console.log('[创建实例] 自动分配端口:', allocatedPort);
    }
    dockerOptions.port = createInstanceDto.port;
    console.log('[创建实例] port 参数:', createInstanceDto.port);
    console.log('[创建实例] dockerOptions:', JSON.stringify(dockerOptions));

    // 设置 Docker 启动命令（默认下载 GMOD 4020）
    // 这个命令会在容器启动时执行，用于初始化环境
    const defaultDockerCmd = `

    `.trim();

    dockerOptions.Cmd = ['/bin/sh', '-c', defaultDockerCmd];

    const imageName = createInstanceDto.dockerImage || 'gmod-custom';
    console.log('[创建实例] 使用镜像:', imageName);
    console.log('[创建实例] Docker 配置:', JSON.stringify({ binds, Cmd: dockerOptions.Cmd }));

    try {
      // 创建 Docker 容器（只创建，不启动）
      console.log('[创建实例] 开始创建 Docker 容器...');
      const dockerId = await this.dockerService.createContainer(
        createInstanceDto.name,
        createInstanceDto.dockerImage, // 传递镜像名
        dockerOptions,
      );
      console.log('[创建实例] Docker 容器创建成功, ID:', dockerId);

      // 获取容器详细信息（包括分配的端口）
      console.log('[创建实例] 获取容器详细信息...');
      const containerInfo = await this.dockerService.getContainerInfo(dockerId);
      console.log('[创建实例] 容器信息获取成功');

      const instance = this.instancesRepository.create({
        ...createInstanceDto,
        dockerId,
        containerName: `gmod_${createInstanceDto.name}`,
        status: InstanceStatus.STOPPED,
      });

      const saved = await this.instancesRepository.save(instance);
      console.log('[创建实例] 实例保存成功, ID:', saved.id);
      return saved;
    } catch (error) {
      console.error('[创建实例] 失败:', error.message);
      console.error('[创建实例] 完整错误:', error);
      throw error;
    }
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

    // 删除数据目录
    const dataHostDir = path.join(this.dataRoot, `${instance.name}_data`);
    try {
      await this.dockerService.removeHostDirectory(dataHostDir);
    } catch (error) {
      console.error(`删除数据目录失败: ${dataHostDir}`, error);
      // 不抛出异常,允许继续删除实例
    }
  }

  async start(id: number, userId?: number, userRole?: UserRole): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    let startupArgs = await this.getStartupArgs(instance);
    if (!startupArgs) {
      throw new ConflictException('实例没有关联到启动项！');
    }

    // 强制容器内 srcds 监听固定端口 27015/27005，Docker 端口映射负责转发到宿主机端口
    // 移除用户启动参数中可能存在的端口配置，避免 srcds 监听非预期端口
    startupArgs = startupArgs
      .replace(/-port\s+\d+/gi, '')
      .replace(/\+clientport\s+\d+/gi, '')
      .replace(/\+hostport\s+\d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    startupArgs = `-port 27015 +clientport 27005 ${startupArgs}`;

    await this.dockerService.writeFileToContainer(
      instance.dockerId,
      '/opt/steam/startup.args',
      startupArgs,
    );
    await this.dockerService.startContainer(instance.dockerId);
    instance.status = InstanceStatus.RUNNING;

    return this.instancesRepository.save(instance);
  }

  async stop(id: number, userId?: number, userRole?: UserRole): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    await this.dockerService.stopContainer(instance.dockerId);
    instance.status = InstanceStatus.STOPPED;

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

    // 强制容器内 srcds 监听固定端口 27015/27005，Docker 端口映射负责转发到宿主机端口
    // 移除用户启动参数中可能存在的端口配置，避免 srcds 监听非预期端口
    let finalArgs = startupArgs
      .replace(/-port\s+\d+/gi, '')
      .replace(/\+clientport\s+\d+/gi, '')
      .replace(/\+hostport\s+\d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    finalArgs = `-port 27015 +clientport 27005 ${finalArgs}`;

    // 使用 screen 会话以 gmod 用户运行服务器，并将输出重定向到容器主进程的 stdout
    // runuser 用于切换到 gmod 用户，避免 ROOT 警告
    // stdbuf -o0 禁用输出缓冲，确保实时显示所有控制台消息
    // /proc/1/fd/1 是容器主进程的标准输出
    const command = `runuser -u gmod -- bash -c 'cd /opt/steam && screen -dmS gmod bash -c "stdbuf -o0 ./srcds_run ${finalArgs} 2>&1 | stdbuf -o0 tee /proc/1/fd/1"'`;

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

    // 直接返回容器日志，不添加任何标记
    return this.dockerService.getContainerLogs(instance.dockerId, { since });
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

    // 通过 screen 发送命令到 GMOD 服务器
    const sessionName = 'gmod-server';
    const steamUser = 'steam';

    try {
      // 使用 steam 用户检查 screen 会话是否存在
      const checkSession = await this.dockerService.execCommand(
        instance.dockerId,
        `su - ${steamUser} -c 'screen -ls | grep -q "${sessionName}" && echo "exists" || echo "not_exists"'`,
        { detach: false }
      );

      if (!checkSession.output?.trim().includes('exists')) {
        // 获取详细的会话列表用于调试
        const listSessions = await this.dockerService.execCommand(
          instance.dockerId,
          `su - ${steamUser} -c 'screen -ls'`,
          { detach: false }
        );
        throw new ConflictException(`服务器会话不存在，请重启服务器实例。当前会话: ${listSessions.output}`);
      }

      // 转义到 Bash 的 $'...'
      // 1) 把实际换行/回车/Tab 转成转义序列
      // 2) 反斜杠要先转义
      // 3) 单引号在 $'...' 里需要用 \' 表示
      function toAnsiCString(s) {
        return s
          .replace(/\\/g, '\\\\') // 先转义反斜杠
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t')
          .replace(/'/g, "\\'");  // 再转义单引号
      }

      // 这里的 command 是你想发到 screen 的原始命令，例如：
      // const command = "say hello\n  from method 2";
      const escapedCommand = toAnsiCString(command);

      // 使用方法： su -s /bin/bash steam -c "screen -S gmod-server -X stuff $'... \r'"
      const screenCommand =
        `su -s /bin/bash ${steamUser} -c "screen -S ${sessionName} -X stuff $'${escapedCommand}\\r'"`;

      console.log('[execCommand] 发送命令:', command);
      console.log('[execCommand] 执行 shell:', screenCommand);

      await this.dockerService.execCommand(
        instance.dockerId,
        screenCommand,
        { detach: false }
      );


      return { output: `命令已发送: ${command}` };
    } catch (error) {
      console.error('[execCommand] 发送命令失败:', error);
      throw new ConflictException(`发送命令失败: ${error.message}`);
    }
  }
  private async ensureContainerRunning(instance: Instance): Promise<void> {
    const status = await this.dockerService.getContainerStatus(instance.dockerId!);
    if ((status || '').toLowerCase() !== 'running') {
      throw new ConflictException('容器未运行，无法执行该操作');
    }
  }

  private async allocatePort(): Promise<number> {
    // Source 引擎: 游戏端口 = port, 客户端端口 = port - 10
    // 每个实例占用 [port-10, port] 范围，步长 100 确保永不冲突
    // 实例1: 27015 (客户端 27005)
    // 实例2: 27115 (客户端 27105)
    // 实例3: 27215 (客户端 27205) ...
    const BASE_PORT = 27015;
    const PORT_STEP = 100;

    const instances = await this.instancesRepository.find({
      select: ['port'],
    });

    const usedPorts = new Set(
      instances.map(i => i.port).filter(p => p != null),
    );

    let port = BASE_PORT;
    while (usedPorts.has(port)) {
      port += PORT_STEP;
    }

    console.log('[端口分配] 已占用端口:', Array.from(usedPorts).sort());
    console.log('[端口分配] 分配端口:', port, ', 客户端端口:', port - 10);
    return port;
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

  // ============================================
  // Data 目录管理方法 (新增)
  // ============================================

  private async getDataDir(instanceId: number): Promise<string> {
    const instance = await this.instancesRepository.findOne({ where: { id: instanceId } });
    if (!instance) {
      throw new NotFoundException('实例不存在');
    }
    return path.join(this.dataRoot, `${instance.name}_data`);
  }

  async listDataFiles(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const dataDir = await this.getDataDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(dataDir, sanitizedPath);

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

  async uploadDataFile(
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

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const dataDir = await this.getDataDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const targetDir = path.join(dataDir, sanitizedPath);
    const targetPath = path.join(targetDir, file.originalname);

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, file.buffer);
      return { message: '文件上传成功', filename: file.originalname };
    } catch (error) {
      throw new InternalServerErrorException('文件上传失败: ' + error.message);
    }
  }

  async uploadDataFileToFolder(
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

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const dataDir = await this.getDataDir(instanceId);
    const sanitizedBasePath = this.sanitizePath(basePath);
    const sanitizedRelativePath = this.sanitizePath(fileRelativePath);
    const fullRelativePath = path.join(sanitizedBasePath, sanitizedRelativePath);
    const targetPath = path.join(dataDir, fullRelativePath);
    const targetDir = path.dirname(targetPath);

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, file.buffer);
      return { message: '文件上传成功', filename: path.basename(targetPath) };
    } catch (error) {
      throw new InternalServerErrorException('文件上传失败: ' + error.message);
    }
  }

  async downloadDataFile(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const dataDir = await this.getDataDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(dataDir, sanitizedPath);

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

  async downloadDataFolder(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const dataDir = await this.getDataDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(dataDir, sanitizedPath);

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        throw new BadRequestException('只能打包下载目录');
      }

      const folderName = path.basename(fullPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

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

  async downloadMultipleData(instanceId: number, paths: string[], userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const dataDir = await this.getDataDir(instanceId);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    try {
      for (const relativePath of paths) {
        const sanitizedPath = this.sanitizePath(relativePath);
        const fullPath = path.join(dataDir, sanitizedPath);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          archive.directory(fullPath, path.basename(fullPath));
        } else {
          archive.file(fullPath, { name: path.basename(fullPath) });
        }
      }

      archive.finalize();
      return { stream: archive, filename: 'data_files.zip' };
    } catch (error) {
      throw new InternalServerErrorException('批量下载失败: ' + error.message);
    }
  }

  async deleteDataFile(instanceId: number, relativePath: string, userId: number, userRole: UserRole) {
    await this.checkPermission(instanceId, userId, userRole);

    const dataDir = await this.getDataDir(instanceId);
    const sanitizedPath = this.sanitizePath(relativePath);
    const fullPath = path.join(dataDir, sanitizedPath);

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










