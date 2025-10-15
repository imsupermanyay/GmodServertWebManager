import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstancesService } from './instances.service';
import { InstancesController } from './instances.controller';
import { Instance } from './entities/instance.entity';
import { DockerService } from './docker.service';
import { AuthModule } from '../auth/auth.module';
import { CfgTemplate } from '../config-templates/entities/cfg-template.entity';
import { StartupOption } from '../config-templates/entities/startup-option.entity';
import { InstancesGateway } from './instances.gateway';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Instance, CfgTemplate, StartupOption]),
    AuthModule,
  ],
  controllers: [InstancesController],
  providers: [InstancesService, DockerService, InstancesGateway, WsJwtGuard],
})
export class InstancesModule {}


