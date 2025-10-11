# GMOD 服务器管理系统

这是一个基于 Vue3 + NestJS + MySQL + Docker 的 GMOD 服务器管理系统。

## 功能特性

### 角色系统
- **超级管理员 (SUPER_ADMIN)**: 拥有所有权限
  - 创建和管理普通管理员账号
  - 创建、编辑、删除游戏实例
  - 分配实例给普通管理员

- **普通管理员 (ADMIN)**: 管理分配的实例
  - 查看自己管理的游戏实例
  - 启动、停止、重启实例
  - 查看实例控制台日志

### 主要功能
- ✅ JWT 身份认证
- ✅ 用户角色权限管理
- ✅ Docker 容器集成
- ✅ 游戏实例生命周期管理
- ✅ 实时日志查看
- ✅ 响应式 UI 设计

## 技术栈

### 后端
- NestJS (Node.js 框架)
- TypeScript
- TypeORM
- MySQL
- JWT 认证
- Dockerode (Docker API)

### 前端
- Vue 3
- Vue Router
- Pinia (状态管理)
- TailwindCSS
- Axios

## 快速开始

### 前置要求
- Node.js 18+
- MySQL 8.0+
- Docker (用于容器管理)

### 安装依赖

#### 后端
\`\`\`bash
cd backend
npm install
\`\`\`

#### 前端
\`\`\`bash
cd frontend
npm install
\`\`\`

### 配置环境变量

#### 快速配置（推荐）

使用自动配置脚本快速设置：

**Windows:**
```bash
setup-cors.bat
```

**Linux/Mac:**
```bash
chmod +x setup-cors.sh
./setup-cors.sh
```

#### 手动配置

##### 后端配置 (根目录 `.env`)

\`\`\`env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=gmod_manager

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# 超级管理员默认账号
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=admin123

# CORS 跨域配置 - 允许的前端地址（多个地址用逗号分隔）
# 本地开发示例
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
# 生产环境示例（部署到服务器时修改为实际域名）
# ALLOWED_ORIGINS=https://yourdomain.com,http://your-server-ip
\`\`\`

#### 前端配置 (frontend/.env)

\`\`\`env
# 后端 API 地址
# 本地开发时使用本地后端
VITE_API_BASE_URL=http://localhost:3001

# 部署到服务器时，修改为后端服务器地址
# VITE_API_BASE_URL=http://your-server-ip:3001
\`\`\`

### 启动应用

#### 开发模式

后端:
\`\`\`bash
cd backend
npm run start:dev
\`\`\`

前端:
\`\`\`bash
cd frontend
npm run dev
\`\`\`

#### 使用 Docker Compose

\`\`\`bash
docker-compose up -d
\`\`\`

## 默认账号

- 用户名: `admin`
- 密码: `admin123`
- 角色: 超级管理员

## 跨域配置说明

本系统已经配置好跨域支持，适用于以下场景：

### 场景1: 本地开发（前后端都在本地）
无需特殊配置，默认即可使用。

### 场景2: 前端本地，后端在服务器
1. 修改前端配置 `frontend/.env`:
   \`\`\`env
   VITE_API_BASE_URL=http://your-server-ip:3001
   \`\`\`

2. 修改后端配置 `.env`，添加本地前端地址到 CORS 白名单:
   \`\`\`env
   ALLOWED_ORIGINS=http://localhost:5173,http://your-local-ip:5173
   \`\`\`

3. 启动前端:
   \`\`\`bash
   cd frontend
   npm run dev
   \`\`\`

### 场景3: 前后端都部署到服务器
1. 使用 Docker Compose 部署，nginx 会自动处理跨域
2. 或者配置后端 CORS 白名单为前端域名

### CORS 配置原理
- 后端使用 `ALLOWED_ORIGINS` 环境变量控制允许的前端地址
- 前端使用 `VITE_API_BASE_URL` 指定后端 API 地址
- 支持多个域名，用逗号分隔
- 开发环境自动支持 localhost 和 127.0.0.1

## 项目结构

\`\`\`
GmodServerManager/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── users/          # 用户模块
│   │   ├── instances/      # 实例模块
│   │   └── common/         # 公共模块
│   ├── Dockerfile
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── components/    # 公共组件
│   │   ├── stores/        # 状态管理
│   │   ├── api/          # API 接口
│   │   └── router/       # 路由配置
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env
└── README.md
\`\`\`

## API 端点

### 认证
- POST `/api/auth/login` - 用户登录

### 用户管理 (需要超级管理员权限)
- GET `/api/users` - 获取所有用户
- POST `/api/users` - 创建用户
- PATCH `/api/users/:id` - 更新用户
- DELETE `/api/users/:id` - 删除用户

### 实例管理
- GET `/api/instances` - 获取实例列表
- GET `/api/instances/my` - 获取我的实例 (普通管理员)
- POST `/api/instances` - 创建实例 (超级管理员)
- PATCH `/api/instances/:id` - 更新实例 (超级管理员)
- DELETE `/api/instances/:id` - 删除实例 (超级管理员)
- POST `/api/instances/:id/start` - 启动实例
- POST `/api/instances/:id/stop` - 停止实例
- POST `/api/instances/:id/restart` - 重启实例
- GET `/api/instances/:id/logs` - 获取日志

## 数据库表结构

### users (用户表)
- id: 主键
- username: 用户名
- password: 密码哈希
- role: 角色 (SUPER_ADMIN/ADMIN)
- isActive: 是否激活
- createdAt: 创建时间

### instances (实例表)
- id: 主键
- name: 实例名称
- dockerId: Docker 容器 ID
- containerName: 容器名称
- status: 状态 (STOPPED/RUNNING/RESTARTING/ERROR)
- hostDirectory: 宿主机目录
- containerDirectory: 容器目录
- adminId: 关联的管理员 ID
- createdAt: 创建时间
- updatedAt: 更新时间

## 许可证

MIT
