import {
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Readable } from 'stream';
import { InstancesService } from './instances.service';
import { DockerService } from './docker.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { Instance } from './entities/instance.entity';
import { UserRole } from '../common/enums';

interface InstanceStreamRecord {
  stream: Readable;
  clients: Set<string>;
}

@WebSocketGateway({
  namespace: '/ws/instances',
  cors: {
    origin: true,
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class InstancesGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InstancesGateway.name);
  private readonly instanceStreams = new Map<number, InstanceStreamRecord>();
  private readonly clientSubscriptions = new Map<string, Set<number>>();

  constructor(
    private readonly instancesService: InstancesService,
    private readonly dockerService: DockerService,
  ) {}

  async handleDisconnect(client: Socket): Promise<void> {
    this.cleanupClient(client);
  }

  @SubscribeMessage('subscribeLogs')
  async handleSubscribeLogs(
    @MessageBody() data: { instanceId?: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const instanceId = Number(data?.instanceId);
    if (!instanceId || Number.isNaN(instanceId)) {
      client.emit('logs:error', 'Missing instance ID');
      return;
    }

    try {
      const user = client.data.user;
      if (!user) {
        throw new Error('Unauthorized connection');
      }

      const instance: Instance = await this.instancesService.findOne(
        instanceId,
        user.id,
        user.role as UserRole,
      );

      if (!instance?.dockerId) {
        throw new Error('Instance has no attached container');
      }

      // 如果已有 stream，检查容器是否还在运行，不在则销毁旧 stream 重建
      const existingRecord = this.instanceStreams.get(instanceId);
      if (existingRecord) {
        try {
          const status = await this.dockerService.getContainerStatus(instance.dockerId);
          if (status !== 'running') {
            this.logger.log(`Container for instance ${instanceId} is ${status}, rebuilding stream`);
            this.stopStream(instanceId);
          }
        } catch {
          this.stopStream(instanceId);
        }
      }

      await this.ensureStream(instance);

      client.join(this.roomName(instanceId));
      this.addClientSubscription(client.id, instanceId);

      client.emit('logs:subscribed', { instanceId });
    } catch (error) {
      this.logger.error(
        `Failed to subscribe logs (client=${client.id}, instance=${instanceId}): ${error.message}`,
      );
      client.emit('logs:error', error.message || 'Failed to subscribe logs');
    }
  }

  @SubscribeMessage('unsubscribeLogs')
  async handleUnsubscribeLogs(
    @MessageBody() data: { instanceId?: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const instanceId = Number(data?.instanceId);
    if (!instanceId || Number.isNaN(instanceId)) {
      return;
    }

    this.removeClientSubscription(client, instanceId);
  }

  @SubscribeMessage('execCommand')
  async handleExecCommand(
    @MessageBody() data: { instanceId?: number; command?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const instanceId = Number(data?.instanceId);
    const command = data?.command?.trim();

    if (!instanceId || Number.isNaN(instanceId) || !command) {
      client.emit('commandResult', {
        instanceId: data?.instanceId,
        error: 'Instance ID or command is missing',
      });
      return;
    }

    try {
      const user = client.data.user;
      if (!user) {
        throw new Error('Unauthorized connection');
      }

      const result = await this.instancesService.execCommand(
        instanceId,
        command,
        user.id,
        user.role as UserRole,
      );

      client.emit('commandResult', {
        instanceId,
        message: `Command sent: ${command}`,
        output: result.output || '',
      });
    } catch (error) {
      this.logger.error(
        `Command execution failed (client=${client.id}, instance=${instanceId}): ${error.message}`,
      );

      client.emit('commandResult', {
        instanceId,
        error: error.message || 'Command execution failed',
      });
    }
  }

  private async ensureStream(instance: Instance): Promise<void> {
    if (!instance?.dockerId) {
      throw new Error('Instance has no attached container');
    }

    if (this.instanceStreams.has(instance.id)) {
      return;
    }

    await this.createStream(instance);
  }

  private async createStream(instance: Instance): Promise<void> {
    try {
      const stream = await this.dockerService.streamContainerLogs(instance.dockerId, {
        tail: 200,
      });

      const clients = new Set<string>();
      const record: InstanceStreamRecord = { stream, clients };
      this.instanceStreams.set(instance.id, record);

      // Throttle: buffer log chunks and flush at most every 200ms
      let logBuffer = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      const flushLogs = () => {
        flushTimer = null;
        if (!logBuffer) return;
        const text = logBuffer;
        logBuffer = '';
        this.server
          .to(this.roomName(instance.id))
          .emit('logs', { instanceId: instance.id, logs: text });
      };

      stream.on('data', (chunk: Buffer) => {
        const text = this.dockerService.decodeLogChunk(chunk);
        if (!text) return;

        logBuffer += text;

        // Flush immediately if buffer is large, otherwise debounce
        if (logBuffer.length > 8192) {
          if (flushTimer) {
            clearTimeout(flushTimer);
          }
          flushLogs();
        } else if (!flushTimer) {
          flushTimer = setTimeout(flushLogs, 200);
        }
      });

      stream.on('error', (err) => {
        if (flushTimer) clearTimeout(flushTimer);
        flushLogs();
        this.logger.error(`Log stream error (instance=${instance.id}): ${err.message}`);
        this.handleStreamDisconnect(instance.id, `日志流错误: ${err.message}`);
      });

      stream.on('end', () => {
        if (flushTimer) clearTimeout(flushTimer);
        flushLogs();
        this.logger.warn(`Log stream ended (instance=${instance.id})`);
        this.handleStreamDisconnect(instance.id, '日志流已断开');
      });

      this.logger.log(`Log stream created for instance ${instance.id}`);
    } catch (error) {
      this.logger.error(`Failed to create log stream for instance ${instance.id}: ${error.message}`);
      throw error;
    }
  }

  private async handleStreamDisconnect(instanceId: number, reason: string): Promise<void> {
    // 清理旧流
    this.stopStream(instanceId);

    // 检查是否还有客户端在对应的 room 中
    const roomName = this.roomName(instanceId);
    const room = this.server?.in(roomName);
    let hasSubscribers = false;
    try {
      const sockets = await room.fetchSockets();
      hasSubscribers = sockets.length > 0;
    } catch {
      hasSubscribers = false;
    }

    if (!hasSubscribers) {
      this.logger.log(`No subscribers for instance ${instanceId}, not reconnecting`);
      return;
    }

    // 通知客户端断开
    this.server
      .to(this.roomName(instanceId))
      .emit('logs:disconnected', { instanceId, reason });

    // 5秒后尝试重新连接（仅一次）
    setTimeout(async () => {
      // 再次检查是否还有订阅者
      let stillHasSubscribers = false;
      try {
        const sockets = await this.server?.in(this.roomName(instanceId)).fetchSockets();
        stillHasSubscribers = sockets && sockets.length > 0;
      } catch {
        stillHasSubscribers = false;
      }
      if (!stillHasSubscribers) {
        this.logger.log(`No subscribers for instance ${instanceId} after delay, skipping reconnect`);
        return;
      }

      try {
        const instance = await this.instancesService.findOne(instanceId);
        if (!instance?.dockerId) {
          this.logger.warn(`Instance ${instanceId} no longer exists, not reconnecting`);
          return;
        }

        // 检查容器状态
        const status = await this.dockerService.getContainerStatus(instance.dockerId);
        if (status !== 'running') {
          this.logger.warn(`Container for instance ${instanceId} is not running (${status}), not reconnecting`);
          this.server
            .to(this.roomName(instanceId))
            .emit('logs:error', `容器未运行 (${status})`);
          return;
        }

        this.logger.log(`Attempting to reconnect log stream for instance ${instanceId}`);
        await this.createStream(instance);
        this.server
          .to(this.roomName(instanceId))
          .emit('logs:reconnected', { instanceId });
      } catch (error) {
        this.logger.error(`Failed to reconnect log stream for instance ${instanceId}: ${error.message}`);
        this.server
          .to(this.roomName(instanceId))
          .emit('logs:error', `重连失败: ${error.message}`);
      }
    }, 5000);
  }

  private removeClientSubscription(client: Socket, instanceId: number): void {
    client.leave(this.roomName(instanceId));

    const subscriptions = this.clientSubscriptions.get(client.id);
    subscriptions?.delete(instanceId);

    const record = this.instanceStreams.get(instanceId);
    record?.clients.delete(client.id);

    if (record && record.clients.size === 0) {
      this.stopStream(instanceId);
    }
  }

  private addClientSubscription(clientId: string, instanceId: number): void {
    let subscriptions = this.clientSubscriptions.get(clientId);
    if (!subscriptions) {
      subscriptions = new Set<number>();
      this.clientSubscriptions.set(clientId, subscriptions);
    }
    subscriptions.add(instanceId);

    const record = this.instanceStreams.get(instanceId);
    if (record) {
      record.clients.add(clientId);
    }
  }

  private cleanupClient(client: Socket): void {
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (!subscriptions) {
      return;
    }

    subscriptions.forEach((instanceId) => {
      this.removeClientSubscription(client, instanceId);
    });

    this.clientSubscriptions.delete(client.id);
  }

  private stopStream(instanceId: number): void {
    const record = this.instanceStreams.get(instanceId);
    if (!record) return;

    record.stream.removeAllListeners('data');
    record.stream.removeAllListeners('error');
    record.stream.removeAllListeners('end');
    record.stream.destroy();

    this.instanceStreams.delete(instanceId);

    for (const [clientId, subscriptions] of this.clientSubscriptions.entries()) {
      if (!subscriptions.has(instanceId)) {
        continue;
      }

      subscriptions.delete(instanceId);

      // 安全访问 sockets，避免在服务器未初始化时崩溃
      const client = this.server?.sockets?.sockets?.get(clientId);
      if (client) {
        client.leave(this.roomName(instanceId));
      }

      if (subscriptions.size === 0) {
        this.clientSubscriptions.delete(clientId);
      }
    }
  }

  private roomName(instanceId: number): string {
    return `instance-${instanceId}`;
  }
}
