# 数据库自动初始化说明

## 功能介绍

本系统已经集成了数据库自动初始化功能，会在应用启动时自动检查并创建数据库和用户。

## 工作流程

应用启动时会自动执行以下步骤：

1. **尝试使用配置的用户连接数据库**
   - 如果成功，直接启动应用
   - 如果失败，进入下一步

2. **使用 root 用户初始化**
   - 检查数据库是否存在，不存在则创建
   - 检查用户是否存在，不存在则创建
   - 授予用户对数据库的全部权限
   - 刷新权限表

3. **验证连接**
   - 使用新创建的用户和数据库测试连接
   - 如果成功，应用正常启动

## 配置说明

在 `.env` 文件中配置：

```env
# 数据库配置
DB_HOST=42.121.120.120          # 数据库主机地址
DB_PORT=3306                    # 数据库端口
DB_USERNAME=gmod_user           # 应用使用的数据库用户名
DB_PASSWORD=gmod_password       # 应用使用的数据库密码
DB_DATABASE=gmod_manager        # 数据库名称

# MySQL Root 密码（仅用于自动初始化）
DB_ROOT_PASSWORD=your_root_password_here
```

## 使用场景

### 场景1：全新安装（推荐）

如果您有 MySQL root 权限：

1. 配置 `DB_ROOT_PASSWORD` 为 root 密码
2. 配置其他数据库参数
3. 启动应用

系统会自动：
- 创建数据库 `gmod_manager`
- 创建用户 `gmod_user`
- 授予权限

### 场景2：已有数据库和用户

如果数据库和用户已经创建好：

1. 确保用户有数据库的全部权限
2. 配置 `.env` 中的数据库参数
3. 启动应用

系统会检测到已存在的配置，直接连接。

### 场景3：手动创建

如果您没有 root 权限，或者自动创建失败，可以手动执行以下 SQL：

```sql
-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS `gmod_manager`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 2. 创建用户（替换为您的密码）
CREATE USER 'gmod_user'@'%' IDENTIFIED BY 'gmod_password';

-- 3. 授予权限
GRANT ALL PRIVILEGES ON `gmod_manager`.* TO 'gmod_user'@'%';

-- 4. 刷新权限
FLUSH PRIVILEGES;
```

## 远程数据库配置

如果使用远程 MySQL 服务器，需要确保：

1. **防火墙开放 3306 端口**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 3306

   # CentOS/RHEL
   sudo firewall-cmd --add-port=3306/tcp --permanent
   sudo firewall-cmd --reload
   ```

2. **MySQL 允许远程连接**

   编辑 MySQL 配置文件：
   ```bash
   # Ubuntu/Debian
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

   # CentOS/RHEL
   sudo nano /etc/my.cnf
   ```

   修改或注释：
   ```
   # bind-address = 127.0.0.1
   bind-address = 0.0.0.0
   ```

   重启 MySQL：
   ```bash
   sudo systemctl restart mysql
   ```

3. **创建远程访问用户**
   ```sql
   -- 允许从任何 IP 访问
   CREATE USER 'gmod_user'@'%' IDENTIFIED BY 'gmod_password';
   GRANT ALL PRIVILEGES ON gmod_manager.* TO 'gmod_user'@'%';
   FLUSH PRIVILEGES;

   -- 或者只允许特定 IP 访问（更安全）
   CREATE USER 'gmod_user'@'42.121.120.120' IDENTIFIED BY 'gmod_password';
   GRANT ALL PRIVILEGES ON gmod_manager.* TO 'gmod_user'@'42.121.120.120';
   FLUSH PRIVILEGES;
   ```

## 故障排查

### 错误：Access denied for user 'gmod_user'@'IP' (using password: YES)

**原因：** 用户不存在或密码错误，或者没有从该 IP 连接的权限

**解决方法：**

1. 检查 `.env` 配置是否正确
2. 配置 `DB_ROOT_PASSWORD` 让系统自动创建用户
3. 或者手动执行 SQL 创建用户

### 错误：Unknown database 'gmod_manager'

**原因：** 数据库不存在

**解决方法：**

1. 配置 `DB_ROOT_PASSWORD` 让系统自动创建数据库
2. 或者手动创建数据库：
   ```sql
   CREATE DATABASE gmod_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 错误：Can't connect to MySQL server

**原因：** 无法连接到 MySQL 服务器

**解决方法：**

1. 检查 `DB_HOST` 和 `DB_PORT` 是否正确
2. 检查 MySQL 服务是否运行
3. 检查防火墙是否开放端口
4. 检查网络连接

### 自动初始化失败

如果自动初始化失败，应用日志会显示详细错误信息和手动执行的 SQL 语句。

查看日志中的提示，按照提示手动执行 SQL 即可。

## 安全建议

1. **不要在生产环境中使用默认密码**
   - 修改 `DB_PASSWORD` 为强密码
   - 修改 `SUPER_ADMIN_PASSWORD` 为强密码

2. **限制远程访问 IP**
   - 使用 `'user'@'specific_ip'` 而不是 `'user'@'%'`

3. **不要暴露 root 密码**
   - 仅在初始化时使用 `DB_ROOT_PASSWORD`
   - 初始化完成后可以删除该配置

4. **使用 SSL 连接**
   - 在生产环境中启用 MySQL SSL 连接

## 数据库表结构

系统会自动创建以下表（TypeORM 自动同步）：

- `users` - 用户表
- `instances` - 游戏实例表

所有表使用 `utf8mb4` 字符集，支持 emoji 和中文。

## 备份建议

定期备份数据库：

```bash
# 备份
mysqldump -h 42.121.120.120 -u gmod_user -p gmod_manager > backup.sql

# 恢复
mysql -h 42.121.120.120 -u gmod_user -p gmod_manager < backup.sql
```
