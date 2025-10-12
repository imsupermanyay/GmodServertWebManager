import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstancesModule } from './instances/instances.module';
import { HealthModule } from './health/health.module';
import { ConfigTemplatesModule } from './config-templates/config-templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '42.121.120.120',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'gmod_manager',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // 生产环境请设置为 false
      charset: 'utf8mb4',
      // 添加连接池和超时配置
      extra: {
        connectionLimit: 10,
        connectTimeout: 10000,
      },
      logging: true, // 开启 SQL 日志
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    InstancesModule,
    ConfigTemplatesModule,
  ],
})
export class AppModule { }
