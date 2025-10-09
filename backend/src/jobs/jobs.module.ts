import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JobsProcessor } from './jobs.processor';
import { Job } from '../entities/job.entity';
import { Binding } from '../entities/binding.entity';
import { Instance } from '../entities/instance.entity';
import { BindingsModule } from '../bindings/bindings.module';
import { InstancesModule } from '../instances/instances.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Binding, Instance]),
    BullModule.registerQueue({
      name: 'gmod-tasks',
    }),
    BindingsModule,
    InstancesModule,
  ],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
