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

    // 准备 Docker 容器配置
    const dockerOptions: any = {
      Env: [
        `HOSTNAME=GMOD Server - ${createInstanceDto.name}`,
      ],
    };

    // 如果指定了挂载目录，添加到配置中
    if (createInstanceDto.hostDirectory && createInstanceDto.containerDirectory) {
      dockerOptions.HostConfig = {
        Binds: [`${createInstanceDto.hostDirectory}:${createInstanceDto.containerDirectory}`],
      };
    }

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

    await this.instancesRepository.remove(instance);
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

  async getLogs(id: number, userId?: number, userRole?: UserRole): Promise<string> {
    const instance = await this.findOne(id, userId, userRole);

    if (!instance.dockerId) {
      throw new ConflictException('实例没有关联的 Docker 容器');
    }

    return this.dockerService.getContainerLogs(instance.dockerId);
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
}
