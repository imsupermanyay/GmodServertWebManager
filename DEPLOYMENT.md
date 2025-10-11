# 部署指南

本文档详细说明如何在不同场景下部署 GMOD 服务器管理系统。

## 场景一：本地开发测试

### 1. 前置准备
- 安装 Node.js 18+
- 安装 MySQL 8.0+
- 安装 Docker（用于管理游戏实例）

### 2. 启动 MySQL
```bash
# 方式1: 本地安装的 MySQL
mysql -u root -p
CREATE DATABASE gmod_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 方式2: 使用 Docker
docker run -d \
  --name gmod_mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=gmod_manager \
  -p 3306:3306 \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci
```

### 3. 配置环境变量
根目录 `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=gmod_manager
ALLOWED_ORIGINS=http://localhost:5173
```

前端 `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3001
```

### 4. 安装依赖并启动

**后端:**
```bash
cd backend
npm install
npm run start:dev
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

### 5. 访问
- 前端: http://localhost:5173
- 后端 API: http://localhost:3001/api

---

## 场景二：前端本地开发，后端部署在服务器

### 适用场景
- 团队协作开发
- 前端开发人员测试线上数据
- 避免本地配置复杂的后端环境

### 1. 服务器端配置（后端）

#### 安装依赖
```bash
cd backend
npm install
```

#### 配置环境变量 `.env`
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=gmod_manager

# 重要：添加本地开发者的 IP 到 CORS 白名单
ALLOWED_ORIGINS=http://192.168.1.100:5173,http://localhost:5173,http://另一个开发者的IP:5173
```

#### 启动后端
```bash
# 开发模式
npm run start:dev

# 或使用 PM2 保持运行
npm install -g pm2
pm2 start npm --name "gmod-backend" -- run start:prod
```

#### 开放防火墙端口
```bash
# Ubuntu/Debian
sudo ufw allow 3001

# CentOS/RHEL
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

### 2. 本地配置（前端）

修改 `frontend/.env`:
```env
# 替换为服务器的实际 IP 或域名
VITE_API_BASE_URL=http://your-server-ip:3001
```

启动前端:
```bash
cd frontend
npm run dev
```

### 3. 测试跨域
访问 http://localhost:5173，如果能正常登录，说明跨域配置成功。

---

## 场景三：使用 Docker Compose 完整部署

### 1. 配置环境变量

根目录 `.env`:
```env
PORT=3001
DB_PASSWORD=your_secure_password
DB_DATABASE=gmod_manager
JWT_SECRET=your_very_secure_jwt_secret_key
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=change_this_password

# Docker Compose 部署时，前端通过 nginx 代理访问后端，无需跨域
ALLOWED_ORIGINS=http://localhost
```

### 2. 构建并启动
```bash
# 构建镜像并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看运行状态
docker-compose ps
```

### 3. 访问
- 前端: http://your-server-ip
- 后端 API: http://your-server-ip/api

### 4. 管理命令
```bash
# 停止所有服务
docker-compose down

# 停止并删除所有数据
docker-compose down -v

# 重启某个服务
docker-compose restart backend

# 查看某个服务的日志
docker-compose logs -f frontend
```

---

## 场景四：前后端分别部署到不同服务器

### 1. 后端服务器配置

#### Dockerfile 构建
```bash
cd backend
docker build -t gmod-backend .
docker run -d \
  --name gmod-backend \
  -p 3001:3001 \
  -e DB_HOST=your-mysql-host \
  -e DB_PASSWORD=your_password \
  -e ALLOWED_ORIGINS=https://your-frontend-domain.com \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gmod-backend
```

#### 或使用 PM2
```bash
cd backend
npm install
npm run build
pm2 start dist/main.js --name gmod-backend
pm2 save
pm2 startup
```

### 2. 前端服务器配置

#### 构建前端
修改 `frontend/.env`:
```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

构建:
```bash
cd frontend
npm install
npm run build
```

#### 部署到 Nginx
```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;
    root /var/www/gmod-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 如果需要通过前端代理后端API
    location /api {
        proxy_pass https://your-backend-domain.com;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 生产环境优化建议

### 1. 安全配置
- 修改默认管理员密码
- 使用强 JWT_SECRET
- 配置 HTTPS（使用 Let's Encrypt）
- 限制 CORS 白名单为实际域名
- 使用环境变量管理敏感信息

### 2. 性能优化
- 启用 Nginx gzip 压缩
- 配置静态资源缓存
- 使用 CDN 加速前端资源
- 配置 MySQL 连接池

### 3. 监控和日志
```bash
# 使用 PM2 监控
pm2 monit

# 查看日志
pm2 logs gmod-backend

# 配置日志轮转
pm2 install pm2-logrotate
```

### 4. 备份策略
```bash
# MySQL 备份
mysqldump -u root -p gmod_manager > backup_$(date +%Y%m%d).sql

# Docker 数据卷备份
docker run --rm \
  -v gmod_mysql_data:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/mysql_backup.tar.gz /data
```

---

## 故障排查

### 跨域问题
1. 检查后端 CORS 配置是否包含前端地址
2. 检查前端 API 地址是否正确
3. 查看浏览器控制台 Network 标签的请求头
4. 确认后端服务器防火墙端口已开放

### 连接数据库失败
1. 检查 MySQL 是否正在运行
2. 确认数据库连接信息正确
3. 检查防火墙是否允许数据库端口
4. 查看后端日志获取详细错误信息

### Docker 容器管理失败
1. 确认 Docker socket 已正确挂载
2. 检查后端进程是否有权限访问 Docker
3. 在 Linux 上可能需要将用户添加到 docker 组

---

## 常见问题

**Q: 如何修改管理员密码？**
A: 登录后可以在管理员管理页面修改，或直接在数据库中更新（需要 bcrypt 哈希）。

**Q: 如何开放给外网访问？**
A: 配置服务器防火墙、云服务安全组，开放相应端口（通常是 80/443 和 3001）。

**Q: 前端打包后访问后端 API 404？**
A: 检查 nginx 配置的 proxy_pass 地址是否正确，或修改前端 .env 的 API 地址。

**Q: 如何支持 HTTPS？**
A: 使用 nginx 配置 SSL 证书，可以用 certbot 自动配置 Let's Encrypt 证书。
