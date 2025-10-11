# GMOD 服务器运维与管理平台

> 一套完整的 GMOD 游戏服务器自动化运维管理系统,支持 Docker 容器化部署、Git 代码自动同步、实例生命周期管理和审计追踪。

## 📋 项目简介

这是一个为 Garry's Mod (GMOD) 游戏服务器设计的 Web 管理平台,实现了:

- ✅ **双角色权限体系**: 超级管理员(A) 和 服务器管理员(B)
- ✅ **Docker 容器化**: 自动创建和管理 GMOD 服务器容器
- ✅ **Git 自动部署**: 通过 Gitea Webhook 实现代码推送自动同步
- ✅ **Worktree 机制**: 多分支同时部署,支持多实例共享代码
- ✅ **任务队列**: 使用 BullMQ 处理异步任务,防止阻塞
- ✅ **实时日志**: WebSocket 实时查看容器日志
- ✅ **审计追踪**: 完整记录所有操作历史

## 🏗️ 技术架构

### 后端
- **框架**: NestJS (Node.js + TypeScript)
- **数据库**: MySQL 8.0
- **ORM**: TypeORM
- **队列**: BullMQ + Redis
- **容器**: Docker (通过 dockerode SDK)

### 前端
- **框架**: Vue 3 + TypeScript
- **构建**: Vite 5
- **UI**: Element Plus
- **状态**: Pinia
- **路由**: Vue Router 4
- **HTTP**: Axios

## 📁 项目结构

```
GmodServerManager/
├── backend/                 # 后端 NestJS 项目
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── users/          # 用户管理
│   │   ├── instances/      # 实例管理 + Docker
│   │   ├── repos/          # 仓库管理
│   │   ├── bindings/       # 绑定管理 (Git worktree)
│   │   ├── jobs/           # 任务队列
│   │   ├── webhooks/       # Webhook 接收
│   │   ├── audits/         # 审计日志
│   │   ├── entities/       # 数据库实体
│   │   └── common/         # 公共模块
│   └── package.json
│
├── frontend/               # 前端 Vue3 项目
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── router/        # 路由配置
│   │   ├── views/         # 页面组件
│   │   ├── layouts/       # 布局组件
│   │   └── components/    # 公共组件
│   └── package.json
│
├── docker-compose.yml      # Docker Compose 配置
└── README.md              # 本文档
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0
- Docker + Docker Compose
- MySQL 8.0 (或使用 Docker Compose 自动启动)
- Redis (或使用 Docker Compose 自动启动)
- Git

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd GmodServerManager
```

### 2. 启动基础服务 (MySQL + Redis)

```bash
docker-compose up -d mysql redis
```

### 3. 配置后端

```bash
cd backend

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件,配置数据库连接
# DB_HOST=localhost
# DB_PORT=3306
# DB_USERNAME=gmod_user
# DB_PASSWORD=gmod_password
# DB_DATABASE=gmod_manager

# 安装依赖
npm install

# 启动开发服务器
npm run start:dev
```

后端将在 `http://localhost:3001/api` 启动

**默认管理员账户**:
- 用户名: `admin`
- 密码: `admin123`

### 4. 配置前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://localhost:5173` 启动

### 5. 访问系统

打开浏览器访问: `http://localhost:5173`

使用默认管理员账户登录。

## 📖 核心功能

### 超级管理员 (A 角色)

#### 1. 用户管理
- 创建/编辑/删除管理员账户
- 分配角色权限
- 查看用户管理的实例

#### 2. 实例管理
- **创建实例**: 指定端口、地图、游戏模式、最大玩家数
- **Docker 控制**: 启动/停止/重启容器
- **批量操作**: 同时管理多个实例
- **实时监控**: 查看实例状态和资源占用

#### 3. 仓库管理
- **登记 Gitea 仓库**: 录入仓库 HTTP/SSH 地址
- **配置 Webhook**: 自动生成 Webhook URL 和 Secret
- **分支管理**: 查看和操作不同分支

#### 4. 绑定管理
- **多对多绑定**: 一个分支可绑定多个实例
- **批量绑定**: 选择多个实例一键绑定到同一分支
- **自动同步**: Gitea Push 事件触发代码更新
- **软链接管理**: 自动创建和刷新 symbolic link

#### 5. 审计日志
- 查看所有用户操作记录
- 追踪 Webhook 触发历史
- 导出审计报告

### 服务器管理员 (B 角色)

#### 1. 我的实例
- 查看自己管理的实例列表
- 启动/停止/重启实例
- 查看实例状态和配置

#### 2. 实例详情
- **实时日志**: WebSocket 实时流式查看容器日志
- **日志搜索**: 关键词搜索和过滤
- **日志下载**: 导出历史日志文件

#### 3. 启动项配置
- 修改游戏模式、地图
- 调整最大玩家数
- 配置端口映射
- 一键重启生效

## 🔧 核心工作流程

### 代码自动部署流程

```
1. 开发者推送代码到 Gitea (分支: DEVSERVER)
   ↓
2. Gitea 触发 Webhook -> POST /api/webhooks/gitea
   ↓
3. 后端验证 HMAC-SHA256 签名
   ↓
4. 投递 GIT_SYNC 任务到 BullMQ 队列
   ↓
5. Worker 执行:
   - git fetch origin DEVSERVER
   - cd /srv/allcode/repo1/DEVSERVER
   - git reset --hard origin/DEVSERVER
   ↓
6. 查询绑定表: 哪些实例绑定了 repo1/DEVSERVER
   ↓
7. 如果实例开启了 auto_restart_on_code_change:
   - 投递 INSTANCE_RESTART 任务
   - 依次重启相关实例
```

### Git Worktree 工作原理

```bash
# 1. 创建 bare 仓库
git clone --bare https://gitea.example.com/repo1.git /srv/bare/repo1.git

# 2. 为不同分支创建 worktree
git --git-dir=/srv/bare/repo1.git worktree add /srv/allcode/repo1/ONLINESERVER ONLINESERVER
git --git-dir=/srv/bare/repo1.git worktree add /srv/allcode/repo1/DEVSERVER DEVSERVER

# 3. 创建软链接到实例
ln -sfn /srv/allcode/repo1/ONLINESERVER /srv/instances/1/garrysmod/addons/repo1__ONLINESERVER
ln -sfn /srv/allcode/repo1/ONLINESERVER /srv/instances/2/garrysmod/addons/repo1__ONLINESERVER
ln -sfn /srv/allcode/repo1/DEVSERVER /srv/instances/4/garrysmod/addons/repo1__DEVSERVER
```

**优势**:
- 多个实例共享同一份代码 (节省磁盘)
- 更新代码只需一次 git pull
- 不同分支独立目录,互不影响

## 🌐 API 接口文档

### 认证接口
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `POST /api/auth/me` - 获取当前用户信息

### 用户管理 (仅超级管理员)
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 实例管理
- `GET /api/instances` - 获取实例列表
- `POST /api/instances` - 创建实例
- `PUT /api/instances/:id` - 更新实例
- `DELETE /api/instances/:id` - 删除实例
- `POST /api/instances/:id/start` - 启动实例
- `POST /api/instances/:id/stop` - 停止实例
- `POST /api/instances/:id/restart` - 重启实例
- `GET /api/instances/:id/logs` - 获取实例日志
- `GET /api/instances/:id/status` - 获取实例状态

### 仓库管理 (仅超级管理员)
- `GET /api/repos` - 获取仓库列表
- `POST /api/repos` - 创建仓库
- `PUT /api/repos/:id` - 更新仓库
- `DELETE /api/repos/:id` - 删除仓库
- `POST /api/repos/:id/sync` - 同步仓库
- `GET /api/repos/:id/branches` - 获取分支列表

### 绑定管理 (仅超级管理员)
- `GET /api/bindings` - 获取绑定列表
- `POST /api/bindings` - 创建绑定
- `DELETE /api/bindings/:id` - 删除绑定
- `POST /api/bindings/:id/sync` - 同步代码
- `POST /api/bindings/:id/refresh` - 刷新软链接

### Webhook
- `POST /api/webhooks/gitea` - 接收 Gitea Webhook (公开接口)

### 审计日志 (仅超级管理员)
- `GET /api/audits` - 获取审计日志列表

## 🐳 生产部署 (Linux)

### 1. 环境准备

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 创建必要目录
sudo mkdir -p /srv/bare /srv/allcode /srv/instances
sudo chown -R $USER:$USER /srv
```

### 2. 配置 Docker Socket 权限

```bash
sudo usermod -aG docker $USER
# 重新登录生效
```

### 3. 部署后端

```bash
cd backend

# 生产环境配置
cp .env.example .env
vim .env  # 修改配置

# 构建
npm install
npm run build

# 使用 PM2 运行
npm install -g pm2
pm2 start dist/main.js --name gmod-api
pm2 save
pm2 startup
```

### 4. 部署前端

```bash
cd frontend

# 构建
npm install
npm run build

# 使用 Nginx 部署
sudo apt-get install nginx
sudo cp dist/* /var/www/html/
```

### 5. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. 配置 Gitea Webhook

在 Gitea 仓库设置中添加 Webhook:
- URL: `http://your-domain.com/api/webhooks/gitea`
- Content type: `application/json`
- Secret: 从管理后台获取
- Events: 选择 `Push` 和 `Pull Request`

## 🔐 安全建议

1. **修改默认密码**: 首次登录后立即修改 admin 密码
2. **HTTPS**: 生产环境启用 HTTPS
3. **防火墙**: 只开放必要端口 (80, 443, 27015-27050)
4. **Docker 安全**: 使用非 root 用户运行容器
5. **定期备份**: 备份 MySQL 数据库和 `/srv` 目录
6. **Webhook Secret**: 使用强随机字符串

## 📊 系统监控

### 查看后端日志
```bash
pm2 logs gmod-api
```

### 查看 Docker 容器
```bash
docker ps
docker logs gmod_instance_1
```

### 查看任务队列
```bash
# 进入 Redis CLI
docker exec -it gmod-manager-redis redis-cli

# 查看队列长度
LLEN bull:git-sync:wait
LLEN bull:instance-control:wait
```

## 🐛 常见问题

### Q: 实例创建失败
A: 检查 Docker socket 权限和端口是否被占用

### Q: Webhook 没有触发
A: 检查 Gitea Webhook 配置、网络连通性和 Secret 是否正确

### Q: 软链接无效
A: 确保 `/srv/allcode` 目录存在且 worktree 已创建

### Q: 前端无法连接后端
A: 检查 CORS 配置和 Nginx 反向代理设置

## 📝 开发计划

- [ ] 支持多台物理机分布式部署
- [ ] 实例资源监控 (CPU/内存/网络)
- [ ] 在线玩家统计 (Source Query)
- [ ] 批量实例操作
- [ ] 实例模板功能
- [ ] 蓝绿发布支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 📄 许可证

MIT License

---

**开发者**: Claude + User
**技术支持**: [GitHub Issues](your-repo-url/issues)
