import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Docker from 'dockerode';
import { Instance } from '../entities/instance.entity';
import { InstanceStatus } from '../common/enums/instance-status.enum';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class InstancesService {
  private docker: Docker;

  constructor(
    @InjectRepository(Instance)
    private instanceRepository: Repository<Instance>,
  ) {
    // 初始化 Docker 客户端
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  /**
   * 获取所有实例列表 (根据用户角色过滤)
   */
  async findAll(userId: number, userRole: UserRole): Promise<Instance[]> {
    if (userRole === UserRole.SUPER_ADMIN) {
      // 超级管理员可以查看所有实例
      return this.instanceRepository.find({
        relations: ['owner'],
      });
    } else {
      // 普通管理员只能查看自己的实例
      return this.instanceRepository.find({
        where: { owner_user_id: userId },
        relations: ['owner'],
      });
    }
  }

  /**
   * 获取单个实例详情
   */
  async findOne(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Instance> {
    const instance = await this.instanceRepository.findOne({
      where: { id },
      relations: ['owner', 'bindings'],
    });

    if (!instance) {
      throw new NotFoundException(`实例 ID ${id} 不存在`);
    }

    // 权限检查:普通管理员只能访问自己的实例
    if (
      userRole !== UserRole.SUPER_ADMIN &&
      instance.owner_user_id !== userId
    ) {
      throw new ForbiddenException('无权访问此实例');
    }

    return instance;
  }

  /**
   * 创建新实例
   */
  async create(
    data: CreateInstanceDto,
    userId: number,
  ): Promise<Instance> {
    // 检查容器名称是否已存在
    const existing = await this.instanceRepository.findOne({
      where: { docker_container_name: data.docker_container_name },
    });

    if (existing) {
      throw new BadRequestException(
        `容器名称 ${data.docker_container_name} 已存在`,
      );
    }

    const instance = this.instanceRepository.create({
      ...data,
      owner_user_id: userId,
      status: InstanceStatus.STOPPED,
    });

    return this.instanceRepository.save(instance);
  }

  /**
   * 更新实例信息
   */
  async update(
    id: number,
    data: UpdateInstanceDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    // 合并更新数据
    Object.assign(instance, data);

    return this.instanceRepository.save(instance);
  }

  /**
   * 删除实例
   */
  async remove(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const instance = await this.findOne(id, userId, userRole);

    // 如果容器正在运行,先停止
    if (instance.status === InstanceStatus.RUNNING) {
      await this.stopContainer(instance.docker_container_name);
    }

    await this.instanceRepository.remove(instance);
  }

  /**
   * 启动容器
   */
  async startContainer(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    try {
      let container = this.docker.getContainer(instance.docker_container_name);

      // 检查容器是否存在
      try {
        await container.inspect();
      } catch (error) {
        // 容器不存在,创建新容器
        container = await this.createDockerContainer(instance);
      }

      // 启动容器
      await container.start();

      // 更新状态
      instance.status = InstanceStatus.RUNNING;
      return this.instanceRepository.save(instance);
    } catch (error) {
      throw new BadRequestException(`启动容器失败: ${error.message}`);
    }
  }

  /**
   * 停止容器
   */
  async stopContainer(
    containerName: string,
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerName);
      await container.stop();
    } catch (error) {
      // 容器可能已经停止或不存在,忽略错误
      console.warn(`停止容器 ${containerName} 失败:`, error.message);
    }
  }

  /**
   * 停止实例
   */
  async stopInstance(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    try {
      await this.stopContainer(instance.docker_container_name);

      // 更新状态
      instance.status = InstanceStatus.STOPPED;
      return this.instanceRepository.save(instance);
    } catch (error) {
      throw new BadRequestException(`停止容器失败: ${error.message}`);
    }
  }

  /**
   * 重启实例
   */
  async restartInstance(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Instance> {
    const instance = await this.findOne(id, userId, userRole);

    try {
      const container = this.docker.getContainer(instance.docker_container_name);
      await container.restart();

      // 更新状态
      instance.status = InstanceStatus.RUNNING;
      return this.instanceRepository.save(instance);
    } catch (error) {
      throw new BadRequestException(`重启容器失败: ${error.message}`);
    }
  }

  /**
   * 创建 Docker 容器
   */
  private async createDockerContainer(instance: Instance): Promise<Docker.Container> {
    const config: Docker.ContainerCreateOptions = {
      name: instance.docker_container_name,
      Image: 'gmod-server:latest', // Gmod 服务器镜像
      ExposedPorts: {
        [`${instance.port}/udp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${instance.port}/udp`]: [{ HostPort: String(instance.port) }],
        },
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
      Env: [
        `MAP=${instance.map}`,
        `GAMEMODE=${instance.gamemode}`,
        `MAX_PLAYERS=${instance.max_players}`,
        ...(instance.query_port ? [`QUERY_PORT=${instance.query_port}`] : []),
        ...(instance.rcon_port ? [`RCON_PORT=${instance.rcon_port}`] : []),
      ],
    };

    return this.docker.createContainer(config);
  }

  /**
   * 获取容器日志
   */
  async getContainerLogs(
    id: number,
    userId: number,
    userRole: UserRole,
    tail: number = 100,
  ): Promise<string> {
    const instance = await this.findOne(id, userId, userRole);

    try {
      const container = this.docker.getContainer(instance.docker_container_name);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
      });

      return logs.toString('utf-8');
    } catch (error) {
      throw new BadRequestException(`获取日志失败: ${error.message}`);
    }
  }

  /**
   * 获取容器状态
   */
  async getContainerStatus(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<any> {
    const instance = await this.findOne(id, userId, userRole);

    try {
      const container = this.docker.getContainer(instance.docker_container_name);
      const info = await container.inspect();

      return {
        running: info.State.Running,
        status: info.State.Status,
        startedAt: info.State.StartedAt,
        finishedAt: info.State.FinishedAt,
      };
    } catch (error) {
      throw new NotFoundException(`容器不存在或无法访问`);
    }
  }
}
