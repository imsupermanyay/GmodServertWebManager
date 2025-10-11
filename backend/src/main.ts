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
  const corsOriginsConfig = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = corsOriginsConfig
    ? corsOriginsConfig
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ['*'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });

  // 全局前缀
  app.setGlobalPrefix('api');

  const port = configService.get('PORT') || 3001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);

  // 初始化默认管理员账户
  const authService = app.get(AuthService);
  await authService.initDefaultAdmin();
}

bootstrap();
