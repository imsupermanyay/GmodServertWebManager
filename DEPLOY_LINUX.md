# Debian Linux 服务器部署指南

## 📋 服务器要求

- **系统**: Debian 11/12 或 Ubuntu 20.04/22.04
- **CPU**: 2核以上
- **内存**: 4GB 以上
- **磁盘**: 50GB 以上 (SSD 推荐)
- **权限**: root 或 sudo 用户

---

## 🚀 第一步: 环境准备

### 1. 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. 安装必要工具

```bash
sudo apt install -y curl wget git vim htop net-tools
```

### 3. 安装 Node.js 18

```bash
# 添加 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装 Node.js
sudo apt install -y nodejs

# 验证安装
node -v  # 应该显示 v18.x.x
npm -v   # 应该显示 9.x.x
```

### 4. 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sudo sh

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录使组权限生效
exit
# 重新 SSH 登录

# 验证 Docker
docker -v
docker ps
```

### 5. 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose -v
```

### 6. 安装 MySQL 客户端 (可选,用于调试)

```bash
sudo apt install -y mysql-client
```

### 7. 安装 PM2 (进程管理器)

```bash
sudo npm install -g pm2
```

---

## 📦 第二步: 上传代码

### 方式 1: 使用 Git (推荐)

```bash
# 在服务器上克隆你的仓库
cd /opt
sudo mkdir gmod-manager
sudo chown $USER:$USER gmod-manager
cd gmod-manager

# 如果你已经把代码推送到 Git 仓库
git clone <your-repo-url> .

# 或者从 Windows 传输
```

### 方式 2: 使用 SCP/SFTP 上传

在 Windows PowerShell 执行:

```powershell
# 压缩项目 (排除 node_modules)
cd D:\MyFile\Gmod\GmodServerManager
tar -czf gmod-manager.tar.gz --exclude=node_modules --exclude=.git .

# 上传到服务器
scp gmod-manager.tar.gz user@your-server-ip:/opt/

# 在服务器上解压
ssh user@your-server-ip
cd /opt
sudo mkdir gmod-manager
sudo chown $USER:$USER gmod-manager
tar -xzf gmod-manager.tar.gz -C gmod-manager
cd gmod-manager
```

---

## 🔧 第三步: 配置环境

### 1. 创建必要目录

```bash
sudo mkdir -p /srv/bare /srv/allcode /srv/instances
sudo chown -R $USER:$USER /srv
```

### 2. 配置后端环境变量

```bash
cd /opt/gmod-manager/backend

# 创建生产环境配置
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

# 数据库配置
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=gmod_user
DB_PASSWORD=你的强密码
DB_DATABASE=gmod_manager

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=你的超级长随机密钥_请修改这个值
JWT_EXPIRES_IN=1d

# Docker 配置 (Linux socket 路径)
DOCKER_SOCKET_PATH=/var/run/docker.sock

# GMOD Docker 镜像
GMOD_IMAGE=hackebein/garrysmod:latest

# 文件路径
BARE_REPO_ROOT=/srv/bare
ALLCODE_ROOT=/srv/allcode
INSTANCES_ROOT=/srv/instances

# CORS (改成你的域名或 IP)
CORS_ORIGIN=http://your-domain.com
EOF

# 生成随机密钥
echo "JWT_SECRET=$(openssl rand -base64 32)"
```

**重要**: 修改 `.env` 文件中的:
- `DB_PASSWORD`: 设置强密码
- `JWT_SECRET`: 使用上面生成的随机密钥
- `CORS_ORIGIN`: 改成你的域名或IP

---

## 🗄️ 第四步: 启动数据库服务

### 1. 启动 MySQL 和 Redis

```bash
cd /opt/gmod-manager

# 启动容器
docker-compose up -d mysql redis

# 查看状态
docker ps

# 查看日志
docker logs -f gmod-manager-mysql
# 等待看到 "ready for connections" 再继续
```

### 2. 测试数据库连接

```bash
# 连接 MySQL
docker exec -it gmod-manager-mysql mysql -u gmod_user -p
# 输入密码后:
SHOW DATABASES;
EXIT;

# 测试 Redis
docker exec -it gmod-manager-redis redis-cli PING
# 应该返回: PONG
```

---

## 🚀 第五步: 部署后端

### 1. 安装依赖

```bash
cd /opt/gmod-manager/backend
npm install --production
```

### 2. 构建项目

```bash
npm run build

# 验证构建产物
ls dist/
# 应该看到 main.js 等文件
```

### 3. 使用 PM2 启动

```bash
# 启动后端
pm2 start dist/main.js --name gmod-api

# 查看状态
pm2 status

# 查看日志
pm2 logs gmod-api

# 应该看到:
# 🚀 Application is running on: http://localhost:3000/api
# ✅ 默认管理员账户已创建: admin / admin123
```

### 4. 设置 PM2 开机自启

```bash
# 保存 PM2 配置
pm2 save

# 生成开机启动脚本
pm2 startup

# 执行上面命令输出的 sudo 命令
# 示例: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username
```

### 5. 验证后端

```bash
# 测试 API
curl http://localhost:3000/api/auth/me

# 应该返回未登录提示
```

---

## 🎨 第六步: 部署前端

### 1. 安装依赖并构建

```bash
cd /opt/gmod-manager/frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 验证构建产物
ls dist/
# 应该看到 index.html, assets/ 等文件
```

### 2. 安装 Nginx

```bash
sudo apt install -y nginx
```

### 3. 配置 Nginx

```bash
# 创建站点配置
sudo vim /etc/nginx/sites-available/gmod-manager

# 粘贴以下内容:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名或 IP

    # 前端静态文件
    location / {
        root /opt/gmod-manager/frontend/dist;
        try_files $uri $uri/ /index.html;

        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # WebSocket 支持
        proxy_read_timeout 86400;
    }

    # 日志
    access_log /var/log/nginx/gmod-manager-access.log;
    error_log /var/log/nginx/gmod-manager-error.log;
}
```

### 4. 启用站点并重启 Nginx

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/gmod-manager /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 设置开机自启
sudo systemctl enable nginx
```

### 5. 配置防火墙

```bash
# 如果使用 ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 27015:27050/udp  # GMOD 端口范围
sudo ufw enable
```

---

## ✅ 第七步: 验证部署

### 1. 检查所有服务

```bash
# Docker 容器
docker ps
# 应该看到 mysql 和 redis 运行中

# PM2 进程
pm2 status
# 应该看到 gmod-api online

# Nginx
sudo systemctl status nginx
# 应该是 active (running)
```

### 2. 访问系统

在浏览器打开:
```
http://your-server-ip
```

- 应该看到登录页面
- 使用 `admin` / `admin123` 登录
- 登录成功后进入管理后台

### 3. 测试 API

```bash
# 登录获取 Cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c /tmp/cookies.txt -v

# 获取用户列表
curl http://localhost:3000/api/users \
  -b /tmp/cookies.txt
```

---

## 🔐 第八步: 安全加固

### 1. 修改默认密码

登录后台后,立即修改 admin 密码。

### 2. 启用 HTTPS (推荐使用 Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo systemctl enable certbot.timer
```

Certbot 会自动修改 Nginx 配置,添加 HTTPS。

### 3. 配置防火墙

```bash
# 只允许必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 27015:27050/udp
sudo ufw enable
```

### 4. 限制 MySQL 访问

```bash
# 编辑 MySQL 配置
sudo vim /etc/mysql/mysql.conf.d/mysqld.cnf

# 添加:
bind-address = 127.0.0.1

# 重启 MySQL
sudo systemctl restart mysql
```

---

## 🛠️ 第九步: 配置 GMOD Docker 镜像

### 1. 拉取 GMOD 镜像

```bash
docker pull hackebein/garrysmod:latest
```

### 2. 测试创建容器

在管理后台:
1. 进入"实例管理"
2. 点击"创建实例"
3. 填写表单创建测试实例
4. 点击"启动"按钮

验证:
```bash
# 查看容器
docker ps | grep gmod

# 查看日志
docker logs gmod_instance_1
```

---

## 📊 第十步: 监控和维护

### 1. 查看系统日志

```bash
# 后端日志
pm2 logs gmod-api

# Nginx 日志
sudo tail -f /var/log/nginx/gmod-manager-access.log
sudo tail -f /var/log/nginx/gmod-manager-error.log

# Docker 容器日志
docker logs -f gmod-manager-mysql
docker logs -f gmod-manager-redis
```

### 2. 监控系统资源

```bash
# 安装监控工具
sudo apt install -y htop iotop nethogs

# 查看资源使用
htop
docker stats
```

### 3. 备份数据库

```bash
# 创建备份脚本
sudo vim /opt/backup-gmod.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份 MySQL
docker exec gmod-manager-mysql mysqldump -u gmod_user -pgmod_password gmod_manager > $BACKUP_DIR/mysql_$DATE.sql

# 备份代码和配置
tar -czf $BACKUP_DIR/srv_$DATE.tar.gz /srv

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# 添加执行权限
sudo chmod +x /opt/backup-gmod.sh

# 添加到 crontab (每天凌晨 3 点备份)
sudo crontab -e
# 添加:
0 3 * * * /opt/backup-gmod.sh >> /var/log/gmod-backup.log 2>&1
```

### 4. 更新系统

```bash
# 更新后端代码
cd /opt/gmod-manager/backend
git pull
npm install
npm run build
pm2 restart gmod-api

# 更新前端代码
cd /opt/gmod-manager/frontend
git pull
npm install
npm run build
# Nginx 会自动使用新的 dist 文件
```

---

## 🐛 常见问题

### 问题 1: Nginx 403 Forbidden

```bash
# 检查文件权限
sudo chmod -R 755 /opt/gmod-manager/frontend/dist
sudo chown -R www-data:www-data /opt/gmod-manager/frontend/dist

# 检查 SELinux (如果启用)
sudo setenforce 0
```

### 问题 2: Docker 权限问题

```bash
# 确保用户在 docker 组
sudo usermod -aG docker $USER

# 重新登录
exit
# 重新 SSH 登录

# 测试
docker ps
```

### 问题 3: PM2 进程启动失败

```bash
# 查看详细日志
pm2 logs gmod-api --lines 100

# 删除并重启
pm2 delete gmod-api
pm2 start dist/main.js --name gmod-api
```

### 问题 4: 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :80

# 结束占用进程
sudo kill -9 <PID>
```

---

## 📝 部署完成清单

- [ ] Node.js, Docker, Nginx 已安装
- [ ] 代码已上传到 `/opt/gmod-manager`
- [ ] MySQL 和 Redis 容器运行正常
- [ ] 后端已构建并通过 PM2 启动
- [ ] 前端已构建并通过 Nginx 托管
- [ ] 可以通过浏览器访问系统
- [ ] 默认管理员账户可以登录
- [ ] HTTPS 已配置 (可选)
- [ ] 防火墙已配置
- [ ] 自动备份脚本已设置
- [ ] PM2 开机自启已配置

---

## 🎯 下一步

1. **修改默认密码**
2. **创建测试实例验证 Docker 集成**
3. **配置 Gitea Webhook**
4. **创建普通管理员账户进行权限测试**
5. **监控系统运行状态**

部署完成!享受你的 GMOD 服务器管理平台吧! 🎉
