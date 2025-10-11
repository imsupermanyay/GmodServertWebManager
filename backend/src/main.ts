import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // 启用 CORS
  // 如果 ALLOWED_ORIGINS 设置为 '*'，则允许所有域名访问（仅开发环境使用）
  const allowedOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173';

  if (allowedOrigins === '*') {
    // 允许所有来源（开发环境）
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
  } else {
    // 限制特定来源（生产环境推荐）
    const origins = allowedOrigins.split(',').map(o => o.trim());
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('不允许的跨域请求'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
  }

  // 初始化超级管理员账号
  const usersService = app.get(UsersService);
  await usersService.createSuperAdmin();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`应用程序正在运行于: http://localhost:${port}`);
}

bootstrap();
