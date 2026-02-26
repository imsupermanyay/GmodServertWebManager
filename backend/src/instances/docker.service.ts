import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'stream';
import * as path from 'path';
import * as tar from 'tar-stream';
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
      // 使用传入的镜像名，默认为自定义 gmod 镜像
      const image = imageName || 'gmod-custom';
      const normalizedImage = image.includes(':') ? image : `${image}:latest`;

      console.log('[Docker] 检查镜像是否可用:', normalizedImage);
      await this.ensureImageAvailable(normalizedImage);
      console.log('[Docker] 镜像已就绪:', normalizedImage);

      // 端口配置：如果传入了 port 则使用固定端口，否则自动分配
      // 游戏端口 = port, 客户端端口 = port + 1
      const hostPort = options?.port ? String(options.port) : '0';
      const clientPort = options?.port ? String(options.port + 1) : '0';

      // 基础配置
      const containerConfig: any = {
        name: `gmod_${name}`,
        Image: normalizedImage,
        Tty: true,
        OpenStdin: true,
        User: 'root', // 以 root 身份启动，以便安装依赖
        ExposedPorts: {
          '27015/udp': {},
          '27015/tcp': {},
          '27005/udp': {},
        },
        HostConfig: {
          PortBindings: {
            '27015/udp': [{ HostPort: hostPort }],
            '27015/tcp': [{ HostPort: hostPort }],
            '27005/udp': [{ HostPort: clientPort }],
          },
          RestartPolicy: {
            Name: 'unless-stopped',
          },
          ...(options?.HostConfig || {}),
        },
      };

      // 如果提供了启动命令，添加到配置中
      if (options?.Cmd) {
        containerConfig.Cmd = options.Cmd;
      }

      // 合并其他配置（但不覆盖 HostConfig）
      const { Cmd, HostConfig, ...otherOptions } = options || {};
      Object.assign(containerConfig, otherOptions);

      const container = await this.docker.createContainer(containerConfig);
      console.log('[Docker] 容器创建成功, ID:', container.id);
      return container.id;
    } catch (error) {
      console.error('[Docker] 创建容器失败:', error.message);
      console.error('[Docker] 完整错误:', error);
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
      console.log('停止容器开始:')
      await container.stop();
      console.log('停止容器结束:')
    } catch (error) {
      console.log('停止容器报错:')
      console.log(error)
      if (error?.statusCode === 304) {
        return;
      }
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

  async getContainerLogs(
    dockerId: string,
    options?: { since?: number },
  ): Promise<{ logs: string; cursor: number | null }> {
    try {
      const container = this.docker.getContainer(dockerId);

      const logOptions: Docker.ContainerLogsOptions & { follow: false } = {
        stdout: true,
        stderr: true,
        follow: false,
        timestamps: true,
        tail: options?.since != null ? 0 : 1000,
      };

      if (options?.since != null) {
        logOptions.since = options.since;
      }

      const buffer = (await container.logs(logOptions)) as Buffer;

      const { text, cursor } = this.parseDockerLogs(buffer, options?.since);
      const stripped = this.stripAnsiSequences(text);
      const formatted = this.formatTimestamps(stripped);

      return {
        logs: formatted || (options?.since != null ? '' : '暂无日志输出。'),
        cursor,
      };
    } catch (error) {
      throw new InternalServerErrorException(`获取日志失败: ${error.message}`);
    }
  }

  async streamContainerLogs(
    dockerId: string,
    options?: { since?: number; tail?: number },
  ): Promise<Readable> {
    try {
      const container = this.docker.getContainer(dockerId);
      const logOptions: Docker.ContainerLogsOptions & { follow: true } = {
        stdout: true,
        stderr: true,
        follow: true,
        timestamps: true,
        tail: options?.tail ?? 200,
      };

      if (options?.since != null) {
        logOptions.since = options.since;
      }

      const stream = await container.logs(logOptions);
      return stream as unknown as Readable;
    } catch (error) {
      throw new InternalServerErrorException(`订阅容器日志失败: ${error.message}`);
    }
  }

  async removeContainer(dockerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(dockerId);
      await container.remove({ force: true });
    } catch (error) {
      const status = (error as any)?.statusCode;
      const message = (error as any)?.json?.message || (error as any)?.reason || (error as any)?.message || '';

      if (status === 404 || /no such container/i.test(message)) {
        // 容器已经不存在，视为成功删除
        return;
      }

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

  async pullImage(imageName: string = 'lacledeslan/steamcmd:latest'): Promise<void> {
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
      console.log('[Docker] 本地已有镜像:', imageName);
    } catch (error) {
      // 镜像不存在，尝试拉取
      console.log('[Docker] 本地没有镜像，开始拉取:', imageName);
      await this.pullImage(imageName);
    }
  }

  async execCommand(
    dockerId: string,
    command: string,
    options?: { detach?: boolean; cwd?: string },
  ): Promise<{ output: string }> {
    try {
      const container = this.docker.getContainer(dockerId);

      const commandWithCwd = this.wrapCommandWithCwd(command, options?.cwd);
      const attachStreams = !options?.detach;

      // 打印执行信息
      console.log('[execCommand] 开始执行容器命令');
      console.log(`  容器 ID: ${dockerId.substring(0, 12)}...`);
      console.log(`  原始命令: ${command}`);
      console.log(`  工作目录: ${options?.cwd || '(默认)'}`);
      console.log(`  后台执行: ${options?.detach ? '是' : '否'}`);
      console.log(`  完整命令: ${commandWithCwd}`);

      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', commandWithCwd],
        AttachStdout: attachStreams,
        AttachStderr: attachStreams,
        Tty: false,
      });

      const stream = await exec.start({
        Detach: !!options?.detach,
        Tty: false,
      });

      if (options?.detach) {
        console.log('[execCommand] 命令已在后台执行');
        return { output: '命令已在后台执行' };
      }

      // 收集输出
      return new Promise((resolve, reject) => {
        let output = '';

        stream.on('data', (chunk) => {
          output += chunk.toString('utf8');
        });

        stream.on('end', () => {
          console.log('[execCommand] 命令执行完成');
          console.log(`  输出长度: ${output.length} 字节`);
          if (output) {
            console.log(`  输出内容:\n${output.substring(0, 500)}${output.length > 500 ? '...' : ''}`);
          }
          resolve({ output: output || '命令已发送' });
        });

        stream.on('error', (error) => {
          console.error('[execCommand] 命令执行失败:', error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.error('[execCommand] 执行容器命令异常:', error.message);
      throw new InternalServerErrorException(`执行命令失败: ${error.message}`);
    }
  }

  private wrapCommandWithCwd(command: string, cwd?: string): string {
    if (!cwd) {
      return command;
    }

    const escapedCwd = cwd.replace(/'/g, "'\\''");
    return `cd '${escapedCwd}' && ${command}`;
  }

  private parseDockerLogs(buffer: Buffer, since?: number): { text: string; cursor: number | null } {
    if (!buffer || buffer.length === 0) {
      return { text: '', cursor: since ?? null };
    }

    const isMultiplexed =
      buffer.length >= 8 &&
      buffer[0] <= 2 &&
      buffer[1] === 0 &&
      buffer[2] === 0 &&
      buffer[3] === 0;

    if (!isMultiplexed) {
      const text = buffer.toString('utf8');
      const cursor = this.updateCursorFromText(text, since);
      return { text, cursor };
    }

    let output = '';
    let cursor = since ?? null;
    let offset = 0;

    while (offset + 8 <= buffer.length) {
      const size = buffer.readUInt32BE(offset + 4);
      offset += 8;

      if (size <= 0 || offset + size > buffer.length) {
        break;
      }

      const message = buffer.slice(offset, offset + size).toString('utf8');
      output += message;
      cursor = this.updateCursorFromText(message, cursor);
      offset += size;
    }

    if (!output) {
      const fallback = buffer.toString('utf8');
      output = fallback;
      cursor = this.updateCursorFromText(fallback, cursor);
    }

    return { text: output, cursor };
  }

  private updateCursorFromText(text: string, current: number | null = null): number | null {
    if (!text) {
      return current ?? null;
    }

    const lines = text.split('\n');
    let cursor = current ?? null;

    for (const line of lines) {
      const match = line.match(/^(\d{4}-\d{2}-\d{2}T[0-9:.+-]+)\s/);
      if (!match) {
        continue;
      }

      const parsed = Date.parse(match[1]);
      if (Number.isNaN(parsed)) {
        continue;
      }

      const seconds = parsed / 1000;
      cursor = cursor === null ? seconds : Math.max(cursor, seconds);
    }

    if (cursor === null && text.trim()) {
      cursor = Date.now() / 1000;
    }

    if (cursor !== null) {
      cursor = Number((cursor + 0.001).toFixed(3));
    }

    return cursor;
  }

  private stripAnsiSequences(value: string): string {
    if (!value) {
      return '';
    }

    // eslint-disable-next-line no-control-regex
    return value.replace(/\x1b\[[0-9;]*m/g, '');
  }

  private formatTimestamps(value: string): string {
    if (!value) {
      return '';
    }

    // 匹配 Docker 时间戳格式: 2025-10-15T07:29:43.954117417Z
    // 将 UTC 时间转换为本地时间并替换为简短格式: [15:29:43]
    return value.replace(
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\s/g,
      (match, isoDateTime) => {
        const utcDate = new Date(isoDateTime + 'Z');
        const hours = utcDate.getHours().toString().padStart(2, '0');
        const minutes = utcDate.getMinutes().toString().padStart(2, '0');
        const seconds = utcDate.getSeconds().toString().padStart(2, '0');
        return `[${hours}:${minutes}:${seconds}] `;
      }
    );
  }

  decodeLogChunk(chunk: Buffer): string {
    if (!chunk || chunk.length === 0) {
      return '';
    }

    const { text } = this.parseDockerLogs(chunk, undefined);
    const stripped = this.stripAnsiSequences(text);
    return this.formatTimestamps(stripped);
  }

  async writeFileToContainer(dockerId: string, filePath: string, content: string): Promise<void> {
    try {
      const container = this.docker.getContainer(dockerId);
      const pack = tar.pack();
      const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const normalizedPath = path.posix.normalize(relativePath);
      const directoryName = path.posix.dirname(normalizedPath);

      if (normalizedPath.startsWith('..')) {
        throw new Error('文件路径不能指向容器根目录之外');
      }

      if (directoryName && directoryName !== '.') {
        pack.entry(
          {
            name: directoryName.endsWith('/') ? directoryName : `${directoryName}/`,
            type: 'directory',
            mode: 0o755,
          },
          Buffer.alloc(0),
        );
      }

      const fileBuffer = Buffer.from(content, 'utf8');
      pack.entry({ name: normalizedPath, mode: 0o644 }, fileBuffer);
      pack.finalize();

      await container.putArchive(pack, { path: '/' });
    } catch (error) {
      throw new InternalServerErrorException(`写入容器文件失败: ${error.message}`);
    }
  }

  async readFileFromContainer(dockerId: string, filePath: string): Promise<string> {
    try {
      const container = this.docker.getContainer(dockerId);

      // 读取文件内容
      const command = `cat '${filePath}'`;

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
          // 移除 Docker stream header (前8个字节)
          if (output.length >= 8) {
            output = output.slice(8);
          }
          resolve(output);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      throw new InternalServerErrorException(`读取容器文件失败: ${error.message}`);
    }
  }

  async createHostDirectory(directoryPath: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      await fs.mkdir(directoryPath, { recursive: true });
      console.log(`创建宿主机目录: ${directoryPath}`);
    } catch (error) {
      throw new InternalServerErrorException(`创建宿主机目录失败: ${error.message}`);
    }
  }

  async removeHostDirectory(directoryPath: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      await fs.rm(directoryPath, { recursive: true, force: true });
      console.log(`删除宿主机目录: ${directoryPath}`);
    } catch (error) {
      console.error(`删除宿主机目录失败: ${error.message}`);
      // 不抛出错误，删除目录失败不应该阻止实例删除
    }
  }
}
