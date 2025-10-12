import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Docker = require('dockerode');

@Injectable()
export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
    });
  }

  async createContainer(name: string, imageName?: string, options?: any): Promise<string> {
    try {
      // 使用传入的镜像名，默认为 hackebein/garrysmod
      const image = imageName || 'hackebein/garrysmod';
      const normalizedImage = image.includes(':') ? image : `${image}:latest`;

      await this.ensureImageAvailable(normalizedImage);

      const containerConfig = {
        name: `gmod_${name}`,
        Image: normalizedImage,
        Tty: true,
        OpenStdin: true,
        ExposedPorts: {
          '27015/udp': {},
          '27015/tcp': {},
        },
        HostConfig: {
          PortBindings: {
            '27015/udp': [{ HostPort: '0' }], // 自动分配端口
            '27015/tcp': [{ HostPort: '0' }],
          },
          RestartPolicy: {
            Name: 'unless-stopped',
          },
          ...(options?.HostConfig || {}),
        },
        ...options,
      };

      const container = await this.docker.createContainer(containerConfig);
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

  async getContainerInfo(dockerId: string): Promise<any> {
    try {
      const container = this.docker.getContainer(dockerId);
      const info = await container.inspect();
      let stats: any = null;

      if (info.State?.Running) {
        try {
          stats = await container.stats({ stream: false });
        } catch (err) {
          stats = null;
        }
      }

      const extractStats = (statData: any) => {
        if (!statData) {
          return null;
        }

        const cpuDelta =
          (statData.cpu_stats?.cpu_usage?.total_usage || 0) -
          (statData.precpu_stats?.cpu_usage?.total_usage || 0);
        const systemDelta =
          (statData.cpu_stats?.system_cpu_usage || 0) -
          (statData.precpu_stats?.system_cpu_usage || 0);
        const onlineCpus = statData.cpu_stats?.online_cpus || 0;

        const cpuPercent =
          cpuDelta > 0 && systemDelta > 0
            ? (cpuDelta / systemDelta) * onlineCpus * 100
            : 0;

        const memoryUsage = statData.memory_stats?.usage || 0;
        const memoryLimit = statData.memory_stats?.limit || 0;
        const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

        let networkRx = 0;
        let networkTx = 0;
        if (statData.networks) {
          for (const key of Object.keys(statData.networks)) {
            networkRx += statData.networks[key]?.rx_bytes || 0;
            networkTx += statData.networks[key]?.tx_bytes || 0;
          }
        }

        let blockRead = 0;
        let blockWrite = 0;
        const blkio = statData.blkio_stats?.io_service_bytes_recursive || [];
        for (const item of blkio) {
          if (!item?.op) continue;
          if (item.op.toLowerCase() === 'read') {
            blockRead += item.value || 0;
          }
          if (item.op.toLowerCase() === 'write') {
            blockWrite += item.value || 0;
          }
        }

        return {
          cpuPercent,
          memoryUsage,
          memoryLimit,
          memoryPercent,
          network: {
            rxBytes: networkRx,
            txBytes: networkTx,
          },
          blockIO: {
            read: blockRead,
            write: blockWrite,
          },
        };
      };

      const ports = info.NetworkSettings?.Ports || {};
      const mappedPorts = Object.entries(ports).flatMap(([containerPort, bindings]) => {
        if (!bindings || bindings.length === 0) {
          return [
            {
              containerPort,
              hostPort: null,
              hostIp: null,
            },
          ];
        }

        return bindings.map((binding: any) => ({
          containerPort,
          hostPort: binding.HostPort || null,
          hostIp: binding.HostIp || null,
        }));
      });

      const exposedPorts = Object.keys(info.Config?.ExposedPorts || {});
      const networkDetails = info.NetworkSettings?.Networks || {};
      const networks = Object.entries(networkDetails).map(([name, detail]: [string, any]) => ({
        name,
        ipAddress: detail?.IPAddress || null,
        gateway: detail?.Gateway || null,
        macAddress: detail?.MacAddress || null,
      }));

      const startedAt = info.State?.StartedAt ? new Date(info.State.StartedAt).getTime() : null;
      const uptimeSeconds =
        info.State?.Running && startedAt ? Math.max(0, (Date.now() - startedAt) / 1000) : 0;

      return {
        id: info.Id,
        name: info.Name?.replace(/^\//, '') || info.Name,
        status: info.State.Status,
        running: info.State.Running,
        image: info.Config?.Image || null,
        created: info.Created,
        startedAt: info.State?.StartedAt || null,
        finishedAt: info.State?.FinishedAt || null,
        uptimeSeconds,
        restartCount: info.RestartCount || 0,
        state: info.State,
        mounts: info.Mounts || [],
        ports: mappedPorts,
        exposedPorts,
        network: {
          ipAddress: info.NetworkSettings?.IPAddress || null,
          gateway: info.NetworkSettings?.Gateway || null,
          bridge: info.HostConfig?.NetworkMode || null,
          networks,
        },
        stats: extractStats(stats),
      };
    } catch (error) {
      throw new InternalServerErrorException(`获取容器信息失败: ${error.message}`);
    }
  }

  async pullImage(imageName: string = 'hackebein/garrysmod:latest'): Promise<void> {
    try {
      return new Promise((resolve, reject) => {
        this.docker.pull(imageName, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(stream, (err, output) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });
    } catch (error) {
      throw new InternalServerErrorException(`拉取镜像失败: ${error.message}`);
    }
  }

  private async ensureImageAvailable(imageName: string): Promise<void> {
    try {
      await this.docker.getImage(imageName).inspect();
    } catch (error) {
      // 镜像不存在，尝试拉取
      await this.pullImage(imageName);
    }
  }

  async execCommand(dockerId: string, command: string): Promise<{ output: string }> {
    try {
      const container = this.docker.getContainer(dockerId);

      // 创建 exec 实例
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      // 执行命令
      const stream = await exec.start({ Detach: false, Tty: false });

      // 收集输出
      return new Promise((resolve, reject) => {
        let output = '';

        stream.on('data', (chunk) => {
          output += chunk.toString('utf8');
        });

        stream.on('end', () => {
          resolve({ output: output || '命令已发送' });
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      throw new InternalServerErrorException(`执行命令失败: ${error.message}`);
    }
  }

  async writeFileToContainer(dockerId: string, filePath: string, content: string): Promise<void> {
    try {
      const container = this.docker.getContainer(dockerId);

      // 转义内容中的特殊字符
      const escapedContent = content.replace(/'/g, "'\\''");

      // 创建目录并写入文件
      const command = `mkdir -p $(dirname '${filePath}') && echo '${escapedContent}' > '${filePath}'`;

      // 创建 exec 实例
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      // 执行命令
      const stream = await exec.start({ Detach: false, Tty: false });

      // 等待执行完成
      return new Promise((resolve, reject) => {
        let errorOutput = '';

        stream.on('data', (chunk) => {
          errorOutput += chunk.toString('utf8');
        });

        stream.on('end', () => {
          if (errorOutput && errorOutput.toLowerCase().includes('error')) {
            reject(new Error(`写入文件失败: ${errorOutput}`));
          } else {
            resolve();
          }
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      throw new InternalServerErrorException(`写入文件到容器失败: ${error.message}`);
    }
  }
}
