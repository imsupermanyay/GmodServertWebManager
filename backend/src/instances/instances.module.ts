import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstancesService } from './instances.service';
import { InstancesController } from './instances.controller';
import { Instance } from './entities/instance.entity';
import { DockerService } from './docker.service';

@Module({
  imports: [TypeOrmModule.forFeature([Instance])],
  controllers: [InstancesController],
  providers: [InstancesService, DockerService],
})
export class InstancesModule {}
