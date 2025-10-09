import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as session from 'express-session';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Session 配置
  app.use(
    session({
      secret: configService.get('JWT_SECRET') || 'gmod-manager-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 86400000, // 24小时
        httpOnly: true,
        secure: false, // 开发环境设为false,生产环境HTTPS设为true
      },
    }),
  );

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS 配置
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:5173',
    credentials: true,
  });

  // 全局前缀
  app.setGlobalPrefix('api');

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);

  // 初始化默认管理员账户
  const authService = app.get(AuthService);
  await authService.initDefaultAdmin();
}

bootstrap();
