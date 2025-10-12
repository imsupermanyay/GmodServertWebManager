import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CfgTemplate } from './entities/cfg-template.entity';
import { StartupOption } from './entities/startup-option.entity';
import { CfgTemplatesService } from './cfg-templates.service';
import { StartupOptionsService } from './startup-options.service';
import { CfgTemplatesController } from './cfg-templates.controller';
import { StartupOptionsController } from './startup-options.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CfgTemplate, StartupOption]),
    AuthModule,
  ],
  controllers: [CfgTemplatesController, StartupOptionsController],
  providers: [CfgTemplatesService, StartupOptionsService],
  exports: [CfgTemplatesService, StartupOptionsService],
})
export class ConfigTemplatesModule {}
