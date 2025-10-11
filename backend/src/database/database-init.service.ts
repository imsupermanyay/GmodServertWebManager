import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = parseInt(process.env.DB_PORT) || 3306;
    const dbUser = process.env.DB_USERNAME || 'root';
    const dbPassword = process.env.DB_PASSWORD || 'password';
    const dbName = process.env.DB_DATABASE || 'gmod_manager';
    const rootPassword = process.env.DB_ROOT_PASSWORD || dbPassword;

    let connection;

    try {
      // 1. 首先尝试使用指定的用户连接
      this.logger.log(`尝试使用用户 ${dbUser} 连接到数据库...`);

      try {
        connection = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
          database: dbName,
        });

        this.logger.log('✅ 数据库连接成功');
        await connection.end();
        return;
      } catch (error) {
        this.logger.warn(`无法使用用户 ${dbUser} 连接数据库，尝试使用 root 用户初始化...`);
      }

      // 2. 使用 root 用户连接（不指定数据库）
      try {
        connection = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: 'root',
          password: rootPassword,
        });

        this.logger.log('使用 root 用户连接成功');

        // 3. 检查并创建数据库
        this.logger.log(`检查数据库 ${dbName} 是否存在...`);
        const [databases] = await connection.query(
          `SHOW DATABASES LIKE '${dbName}'`
        );

        if ((databases as any[]).length === 0) {
          this.logger.log(`创建数据库 ${dbName}...`);
          await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${dbName}\`
             CHARACTER SET utf8mb4
             COLLATE utf8mb4_unicode_ci`
          );
          this.logger.log('✅ 数据库创建成功');
        } else {
          this.logger.log('✅ 数据库已存在');
        }

        // 4. 检查并创建用户（如果不是 root）
        if (dbUser !== 'root') {
          this.logger.log(`检查用户 ${dbUser} 是否存在...`);

          // 检查用户是否存在
          const [users] = await connection.query(
            `SELECT User FROM mysql.user WHERE User = '${dbUser}'`
          );

          if ((users as any[]).length === 0) {
            this.logger.log(`创建用户 ${dbUser}...`);

            // 创建用户并授权
            await connection.query(
              `CREATE USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`
            );

            this.logger.log('✅ 用户创建成功');
          } else {
            this.logger.log('✅ 用户已存在');
          }

          // 5. 授予权限
          this.logger.log(`授予用户 ${dbUser} 对数据库 ${dbName} 的全部权限...`);

          await connection.query(
            `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%'`
          );

          await connection.query('FLUSH PRIVILEGES');

          this.logger.log('✅ 权限授予成功');
        }

        await connection.end();

        // 6. 验证最终连接
        this.logger.log('验证数据库连接...');
        const testConnection = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
          database: dbName,
        });

        await testConnection.end();
        this.logger.log('✅ 数据库初始化完成，连接验证成功！');

      } catch (rootError) {
        this.logger.error('❌ 使用 root 用户初始化失败:', rootError.message);
        this.logger.error('请检查以下配置：');
        this.logger.error(`  - DB_HOST: ${dbHost}`);
        this.logger.error(`  - DB_PORT: ${dbPort}`);
        this.logger.error(`  - DB_ROOT_PASSWORD: ${rootPassword ? '已设置' : '未设置'}`);
        this.logger.error('如果无法自动创建，请手动执行以下 SQL：');
        this.logger.error(`  CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        if (dbUser !== 'root') {
          this.logger.error(`  CREATE USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`);
          this.logger.error(`  GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';`);
          this.logger.error(`  FLUSH PRIVILEGES;`);
        }
      }

    } catch (error) {
      this.logger.error('❌ 数据库初始化失败:', error.message);
      this.logger.warn('应用将继续启动，但可能无法正常工作');
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (err) {
          // 忽略关闭连接的错误
        }
      }
    }
  }
}
