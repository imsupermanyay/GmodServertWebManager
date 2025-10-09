import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BindingsController } from './bindings.controller';
import { BindingsService } from './bindings.service';
import { Binding } from '../entities/binding.entity';
import { Repo } from '../entities/repo.entity';
import { Instance } from '../entities/instance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Binding, Repo, Instance])],
  controllers: [BindingsController],
  providers: [BindingsService],
  exports: [BindingsService],
})
export class BindingsModule {}
