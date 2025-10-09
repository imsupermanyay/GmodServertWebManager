import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstancesModule } from './instances/instances.module';
import { ReposModule } from './repos/repos.module';
import { BindingsModule } from './bindings/bindings.module';
import { JobsModule } from './jobs/jobs.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuditsModule } from './audits/audits.module';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 数据库配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development', // 生产环境请使用 migration
        logging: configService.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
      }),
    }),

    // Redis 和 BullMQ 配置
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    // 业务模块
    AuthModule,
    UsersModule,
    InstancesModule,
    ReposModule,
    BindingsModule,
    JobsModule,
    WebhooksModule,
    AuditsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
