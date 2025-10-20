import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import * as mysql from 'mysql2/promise';

async function initializeDatabase() {
  const logger = new Logger('DatabaseInit');
  const dbHost = process.env.DB_HOST;
  const dbPort = parseInt(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USERNAME || 'root';
  const dbPassword = process.env.DB_PASSWORD || 'password';
  const dbName = process.env.DB_DATABASE || 'gmod_manager';
  const rootPassword = process.env.DB_ROOT_PASSWORD || dbPassword;

  let connection;

  try {
    // 1. 首先尝试使用指定的用户连接
    logger.log(`尝试使用用户 ${dbUser} 连接到数据库...`);

    try {
      connection = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
      });

      logger.log('✅ 数据库连接成功');
      await connection.end();
      return true;
    } catch (error) {
      logger.warn(`无法使用用户 ${dbUser} 连接数据库，尝试使用 root 用户初始化...`);
    }

    // 2. 使用 root 用户连接（不指定数据库）
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: 'root',
      password: rootPassword,
    });

    logger.log('使用 root 用户连接成功');

    // 3. 检查并创建数据库
    logger.log(`检查数据库 ${dbName} 是否存在...`);
    const [databases] = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);

    if ((databases as any[]).length === 0) {
      logger.log(`创建数据库 ${dbName}...`);
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      logger.log('✅ 数据库创建成功');
    } else {
      logger.log('✅ 数据库已存在');
    }

    // 4. 检查并创建用户（如果不是 root）
    if (dbUser !== 'root') {
      logger.log(`检查用户 ${dbUser} 是否存在...`);

      const [users] = await connection.query(`SELECT User FROM mysql.user WHERE User = '${dbUser}'`);

      if ((users as any[]).length === 0) {
        logger.log(`创建用户 ${dbUser}...`);
        await connection.query(`CREATE USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`);
        logger.log('✅ 用户创建成功');
      } else {
        logger.log('✅ 用户已存在');
      }

      // 5. 授予权限
      logger.log(`授予用户 ${dbUser} 对数据库 ${dbName} 的全部权限...`);
      await connection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%'`);
      await connection.query('FLUSH PRIVILEGES');
      logger.log('✅ 权限授予成功');
    }

    await connection.end();

    // 6. 验证最终连接
    logger.log('验证数据库连接...');
    const testConnection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });

    await testConnection.end();
    logger.log('✅ 数据库初始化完成，连接验证成功！');
    return true;

  } catch (error) {
    logger.error('❌ 数据库初始化失败:', error.message);
    logger.error('请手动执行以下 SQL：');
    logger.error(`  CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    if (dbUser !== 'root') {
      logger.error(`  CREATE USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`);
      logger.error(`  GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';`);
      logger.error(`  FLUSH PRIVILEGES;`);
    }
    return false;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        // 忽略
      }
    }
  }
}

async function bootstrap() {
  // 在创建应用之前先初始化数据库
  await initializeDatabase();

  const app = await NestFactory.create(AppModule);

  // 设置全局路由前缀
  app.setGlobalPrefix('api', { exclude: ['socket.io', 'socket.io/(.*)'] });

  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // 启用 CORS
  // 如果 ALLOWED_ORIGINS 设置为 '*'，则允许所有域名访问（仅开发环境使用）
  const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';

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
  try {
    const logger = new Logger('Bootstrap');
    logger.log('开始初始化超级管理员账号...');
    const usersService = app.get(UsersService);
    await usersService.createSuperAdmin();
    logger.log('超级管理员账号初始化完成');
  } catch (error) {
    const logger = new Logger('Bootstrap');
    logger.error('初始化超级管理员失败:', error);
    // 继续启动，但记录错误
  }

  const port = process.env.PORT || 3001;
  // 监听所有网络接口（0.0.0.0）
  await app.listen(port, '0.0.0.0');
  console.log(`应用程序正在运行于: http://0.0.0.0:${port}`);
}

bootstrap();

