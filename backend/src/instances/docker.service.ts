import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Docker from 'dockerode';

@Injectable()
export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
    });
  }

  async createContainer(name: string, options?: any): Promise<string> {
    try {
      const container = await this.docker.createContainer({
        name: `gmod_${name}`,
        Image: 'gmod:latest', // 需要提前构建镜像
        ...options,
      });

      return container.id;
    } catch (error) {
      throw new InternalServerErrorException(`创建容器失败: ${error.message}`);
    }
  }

  async startContainer(dockerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(dockerId);
      await container.start();
    } catch (error) {
      throw new InternalServerErrorException(`启动容器失败: ${error.message}`);
    }
  }

  async stopContainer(dockerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(dockerId);
      await container.stop();
    } catch (error) {
      throw new InternalServerErrorException(`停止容器失败: ${error.message}`);
    }
  }

  async restartContainer(dockerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(dockerId);
      await container.restart();
    } catch (error) {
      throw new InternalServerErrorException(`重启容器失败: ${error.message}`);
    }
  }

  async getContainerStatus(dockerId: string): Promise<string> {
    try {
      const container = this.docker.getContainer(dockerId);
      const info = await container.inspect();
      return info.State.Status;
    } catch (error) {
      return 'unknown';
    }
  }

  async getContainerLogs(dockerId: string): Promise<string> {
    try {
      const container = this.docker.getContainer(dockerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 100,
      });
      return logs.toString();
    } catch (error) {
      throw new InternalServerErrorException(`获取日志失败: ${error.message}`);
    }
  }

  async removeContainer(dockerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(dockerId);
      await container.remove({ force: true });
    } catch (error) {
      throw new InternalServerErrorException(`删除容器失败: ${error.message}`);
    }
  }
}
