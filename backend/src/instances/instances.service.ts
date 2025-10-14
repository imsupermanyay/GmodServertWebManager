import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from './entities/instance.entity';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { DockerService } from './docker.service';
import { InstanceStatus, UserRole } from '../common/enums';
import { CfgTemplate } from '../config-templates/entities/cfg-template.entity';
import { StartupOption } from '../config-templates/entities/startup-option.entity';

@Injectable()
export class InstancesService {
  constructor(
    @InjectRepository(Instance)
    private instancesRepository: Repository<Instance>,
    @InjectRepository(CfgTemplate)
    private cfgTemplatesRepository: Repository<CfgTemplate>,
    @InjectRepository(StartupOption)
    private startupOptionsRepository: Repository<StartupOption>,
    private dockerService: DockerService,
  ) { }

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
    if (createInstanceDto.hostDirectory && createInstanceDto.containerDirectory) {
      dockerOptions.HostConfig = {
        Binds: [`${createInstanceDto.hostDirectory}:${createInstanceDto.containerDirectory}`],
      };
    }

    // 设置 Docker 启动命令（默认下载 GMOD 4020）
    // 这个命令会在容器启动时执行，用于初始化环境
    const defaultDockerCmd = `
      bash -c '
        echo "[INIT] ========== 容器初始化开始 =========="
        echo "[INIT] 容器启动时间: $(date)"

        # 检查并安装 32 位运行库
        if [ ! -f /usr/lib/i386-linux-gnu/libstdc++.so.6 ]; then
          echo "[INIT] =========================================="
          echo "[INIT] 开始安装 32 位运行库..."
          echo "[INIT] =========================================="

          # 清理可能残留的 apt 进程和锁文件
          pkill -9 apt-get 2>/dev/null || true
          pkill -9 apt 2>/dev/null || true
          rm -f /var/lib/apt/lists/lock /var/lib/dpkg/lock* 2>/dev/null || true
          sleep 1

          # 自动检测 Debian 版本并配置国内镜像源
          echo "[INIT] [1/3] 配置阿里云镜像源以加速下载..."
          DEBIAN_VERSION=$(grep VERSION_CODENAME /etc/os-release 2>/dev/null | cut -d= -f2)
          if [ -z "$DEBIAN_VERSION" ]; then
            DEBIAN_VERSION="bookworm"
          fi
          echo "[INIT]   检测到 Debian 版本: $DEBIAN_VERSION"

          cp /etc/apt/sources.list /etc/apt/sources.list.bak 2>/dev/null || true
          cat > /etc/apt/sources.list << EOFMIRROR
deb http://mirrors.aliyun.com/debian/ $DEBIAN_VERSION main contrib non-free non-free-firmware
deb http://mirrors.aliyun.com/debian/ $DEBIAN_VERSION-updates main contrib non-free non-free-firmware
deb http://mirrors.aliyun.com/debian-security $DEBIAN_VERSION-security main contrib non-free non-free-firmware
EOFMIRROR
          echo "[INIT] ✓ 镜像源配置完成"

          echo "[INIT] [2/3] 正在更新软件包列表（预计 30-60 秒）..."
          apt-get update 2>&1 | while IFS= read -r line; do
            case "$line" in
              Get:*|Fetched*|Reading*)
                echo "[INIT]   $line"
                ;;
            esac
          done
          echo "[INIT] ✓ 软件包列表更新完成"

          echo "[INIT] [3/3] 正在安装 lib32gcc-s1, lib32stdc++6, libc6-i386（预计 2-5 分钟）..."
          DEBIAN_FRONTEND=noninteractive apt-get install -y lib32gcc-s1 lib32stdc++6 libc6-i386 2>&1 | while IFS= read -r line; do
            case "$line" in
              *Unpacking*|*"Setting up"*|*Processing*|*Selecting*)
                echo "[INIT]   $line"
                ;;
            esac
          done
          echo "[INIT] =========================================="
          echo "[INIT] ✓ 32 位运行库安装完成！"
          echo "[INIT] =========================================="
        else
          echo "[INIT] ✓ 32 位运行库已存在，跳过安装"
        fi

        # 设置 Steam 安装目录
        INSTALL_DIR="/app/Steam/steamapps/common/GarrysModDS"

        # 检查是否已经下载过 GMOD
        if [ ! -d "$INSTALL_DIR" ]; then
          echo "[INIT] 开始下载 GMOD 服务器（AppID 4020），此过程可能需要 5-15 分钟..."
          mkdir -p /app/Steam
          cd /app
          ./steamcmd.sh +force_install_dir /app/Steam +login anonymous +app_update 4020 validate +quit
          echo "[INIT] ✓ GMOD 服务器下载完成"
        else
          echo "[INIT] ✓ GMOD 服务器已存在，跳过下载"
        fi

        echo "[INIT] ========== 初始化完成，容器保持运行 =========="
        echo "[INIT] 完成时间: $(date)"

        # 保持容器运行
        tail -f /dev/null
      '
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

  async findOne(id: number, userId?: number, userRole?: UserRole): Promise<Instance> {
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

    return instance;
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

    // 使用 screen 或后台方式运行服务器
    const command = `./srcds_run ${startupArgs} > /tmp/srcds.log 2>&1 &`;

    await this.dockerService.execCommand(instance.dockerId, command, {
      cwd: '/app/Steam/steamapps/common/GarrysModDS',
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

    const stopCommand = [
      'if [ -x ./srcds_run ]; then ./srcds_run -stop >/dev/null 2>&1 || true; fi',
      'pkill -f srcds_linux >/dev/null 2>&1 || true',
      'pkill -f srcds_run >/dev/null 2>&1 || true',
    ].join('; ');

    const result = await this.dockerService.execCommand(instance.dockerId, stopCommand, {
      cwd: '/app/Steam/steamapps/common/GarrysModDS',
    });

    const message = result.output?.trim() || '服务器停止命令已执行';
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

    return {
      ...instance,
      containerInfo,
    };
  }

  async execCommand(id: number, command: string, userId?: number, userRole?: UserRole): Promise<any> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    // 检查实例是否在运行
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new ConflictException('实例未运行，无法执行命令');
    }

    return this.dockerService.execCommand(instance.dockerId, command);
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
}




