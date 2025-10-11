import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstancesModule } from './instances/instances.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_DATABASE || 'gmod_manager',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // 生产环境请设置为 false
        charset: 'utf8mb4',
        // 增加连接重试配置
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    AuthModule,
    UsersModule,
    InstancesModule,
  ],
})
export class AppModule {}
