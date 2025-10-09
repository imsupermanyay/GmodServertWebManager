import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { Instance } from '../entities/instance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Instance])],
  controllers: [InstancesController],
  providers: [InstancesService],
  exports: [InstancesService],
})
export class InstancesModule {}
