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

    const stream = await this.dockerService.streamContainerLogs(instance.dockerId, {
      tail: 200,
    });

    const clients = new Set<string>();
    const record: InstanceStreamRecord = { stream, clients };
    this.instanceStreams.set(instance.id, record);

    stream.on('data', (chunk: Buffer) => {
      const text = this.dockerService.decodeLogChunk(chunk);
      if (!text) return;

      this.server
        .to(this.roomName(instance.id))
        .emit('logs', { instanceId: instance.id, logs: text });
    });

    stream.on('error', (err) => {
      this.logger.error(`Log stream error (instance=${instance.id}): ${err.message}`);
      this.server
        .to(this.roomName(instance.id))
        .emit('logs:error', `Log stream error: ${err.message}`);
      this.stopStream(instance.id);
    });

    stream.on('end', () => {
      this.logger.warn(`Log stream ended (instance=${instance.id})`);
      this.server
        .to(this.roomName(instance.id))
        .emit('logs:error', 'Log stream ended');
      this.stopStream(instance.id);
    });
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
