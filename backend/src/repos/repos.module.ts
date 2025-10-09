import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReposController } from './repos.controller';
import { ReposService } from './repos.service';
import { Repo } from '../entities/repo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Repo])],
  controllers: [ReposController],
  providers: [ReposService],
  exports: [ReposService],
})
export class ReposModule {}
