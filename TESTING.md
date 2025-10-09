# 本地测试指南 (Windows 环境)

## 📋 准备工作

### 1. 检查环境

确保你的 Windows 系统已安装:

```bash
# 检查 Node.js (需要 >= 18)
node -v

# 检查 npm
npm -v

# 检查 Docker Desktop
docker -v
docker-compose -v
```

如果没有安装:
- Node.js: https://nodejs.org/ (下载 LTS 版本)
- Docker Desktop: https://www.docker.com/products/docker-desktop/

---

## 🚀 第一步: 启动基础服务

### 1. 在项目根目录启动 MySQL 和 Redis

```bash
cd D:\MyFile\Gmod\GmodServerManager

# 启动 MySQL 和 Redis 容器
docker-compose up -d mysql redis

# 查看容器状态
docker ps

# 应该看到两个容器在运行:
# - gmod-manager-mysql (端口 3306)
# - gmod-manager-redis (端口 6379)
```

### 2. 等待 MySQL 启动完成 (约 30 秒)

```bash
# 查看 MySQL 日志,等待 "ready for connections" 提示
docker logs -f gmod-manager-mysql

# 出现这行表示启动完成:
# [Server] /usr/sbin/mysqld: ready for connections.
```

---

## 🔧 第二步: 启动后端

### 1. 进入后端目录

```bash
cd D:\MyFile\Gmod\GmodServerManager\backend
```

### 2. 配置环境变量

```bash
# 创建 .env 文件
copy .env.example .env

# 用记事本或 VSCode 编辑 .env
notepad .env
```

确保配置正确:
```env
NODE_ENV=development
PORT=3000

DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=gmod_user
DB_PASSWORD=gmod_password
DB_DATABASE=gmod_manager

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=gmod-manager-secret-key
CORS_ORIGIN=http://localhost:5173

# Windows Docker Desktop 的 socket 路径
DOCKER_SOCKET_PATH=//./pipe/docker_engine

BARE_REPO_ROOT=D:/gmod-repos/bare
ALLCODE_ROOT=D:/gmod-repos/allcode
INSTANCES_ROOT=D:/gmod-repos/instances
```

### 3. 创建必要的目录

```bash
mkdir D:\gmod-repos\bare
mkdir D:\gmod-repos\allcode
mkdir D:\gmod-repos\instances
```

### 4. 安装依赖

```bash
npm install
```

### 5. 启动后端

```bash
npm run start:dev
```

**成功标志**:
```
🚀 Application is running on: http://localhost:3000/api
✅ 默认管理员账户已创建: admin / admin123
```

**如果报错**:
- `Error: connect ECONNREFUSED 127.0.0.1:3306` → MySQL 没启动,回到第一步
- `ER_ACCESS_DENIED_ERROR` → 数据库密码错误,检查 .env 配置
- `Cannot find module` → 依赖没装完,重新 `npm install`

---

## 🎨 第三步: 启动前端

### 1. 新开一个终端,进入前端目录

```bash
cd D:\MyFile\Gmod\GmodServerManager\frontend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动前端

```bash
npm run dev
```

**成功标志**:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## ✅ 第四步: 测试功能

### 1. 打开浏览器访问

```
http://localhost:5173
```

### 2. 登录测试

- 用户名: `admin`
- 密码: `admin123`

登录成功后应该进入超级管理员仪表盘。

### 3. 测试基本功能

#### 测试 1: 用户管理

1. 左侧菜单点击 "用户管理"
2. 点击 "创建用户" 按钮
3. 填写表单:
   - 用户名: `testuser`
   - 邮箱: `test@example.com`
   - 密码: `test123456`
   - 角色: `ADMIN` (普通管理员)
4. 点击"确定"
5. 应该在列表中看到新用户

#### 测试 2: 创建实例 (需要 Docker)

1. 左侧菜单点击 "实例管理"
2. 点击 "创建实例"
3. 填写表单:
   - 实例名称: `测试服务器1`
   - 端口: `27015`
   - 查询端口: `27016`
   - 地图: `gm_construct`
   - 游戏模式: `sandbox`
   - 最大玩家数: `16`
   - 所有者: 选择一个用户
4. 点击"确定"

**注意**:
- Windows 环境下 Docker 集成可能有权限问题
- 建议实例功能在 Linux 服务器上测试

#### 测试 3: 仓库管理

1. 左侧菜单点击 "仓库管理"
2. 点击 "登记仓库"
3. 填写测试仓库:
   - 仓库名称: `test-repo`
   - HTTP URL: `https://github.com/yourusername/test-repo.git`
   - 默认分支: `main`
   - 备注: `测试仓库`
4. 点击"确定"

#### 测试 4: API 接口测试

使用 PowerShell 或 curl 测试 API:

```powershell
# 登录
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin123"}' `
  -c cookies.txt

# 获取用户列表
curl http://localhost:3000/api/users `
  -b cookies.txt

# 获取实例列表
curl http://localhost:3000/api/instances `
  -b cookies.txt
```

---

## 🐛 常见问题排查

### 问题 1: 后端启动失败

**报错**: `Error: Cannot find module`
```bash
# 解决: 删除 node_modules 重新安装
cd backend
rm -rf node_modules package-lock.json
npm install
```

**报错**: `Port 3000 is already in use`
```bash
# 解决: 修改 .env 中的 PORT 或关闭占用端口的程序
netstat -ano | findstr :3000
taskkill /PID <PID号> /F
```

### 问题 2: 前端无法连接后端

**报错**: `Network Error` 或 `CORS policy`

检查:
1. 后端是否启动 (http://localhost:3000/api)
2. CORS 配置: backend/.env 中 `CORS_ORIGIN=http://localhost:5173`
3. 前端代理配置: frontend/vite.config.ts

### 问题 3: MySQL 连接失败

```bash
# 检查 MySQL 容器状态
docker ps | findstr mysql

# 查看 MySQL 日志
docker logs gmod-manager-mysql

# 重启 MySQL
docker restart gmod-manager-mysql

# 如果还不行,删除容器和数据卷重新创建
docker-compose down -v
docker-compose up -d mysql redis
```

### 问题 4: Docker 权限问题 (Windows)

Windows 下 Docker Desktop 可能需要管理员权限:
1. 右键"Docker Desktop" → 以管理员身份运行
2. 确保 WSL 2 已启用
3. 在 Docker Desktop 设置中启用 "Expose daemon on tcp://localhost:2375 without TLS"

---

## 📊 验证系统状态

### 1. 检查所有服务

```bash
# MySQL
docker exec -it gmod-manager-mysql mysql -u gmod_user -p
# 输入密码: gmod_password
# 执行: SHOW DATABASES;
# 应该看到 gmod_manager 数据库

# Redis
docker exec -it gmod-manager-redis redis-cli
# 执行: PING
# 应该返回: PONG

# 后端
curl http://localhost:3000/api
# 应该返回: "Cannot GET /api" (正常,因为需要具体路由)

# 前端
# 浏览器打开 http://localhost:5173 应该看到登录页面
```

### 2. 检查数据库表

```bash
docker exec -it gmod-manager-mysql mysql -u gmod_user -p gmod_manager

# 执行:
SHOW TABLES;

# 应该看到这些表:
# - users
# - instances
# - repos
# - bindings
# - webhook_secrets
# - jobs
# - audits
```

---

## 🎯 测试完成清单

- [ ] MySQL 和 Redis 容器正常运行
- [ ] 后端启动成功,可以访问 http://localhost:3000/api
- [ ] 前端启动成功,可以访问 http://localhost:5173
- [ ] 登录功能正常
- [ ] 可以创建用户
- [ ] 可以查看仪表盘
- [ ] 数据库表正常创建
- [ ] 默认管理员账户存在

完成以上测试后,就可以准备部署到 Linux 服务器了!

---

## 🚪 停止服务

测试完成后,按以下顺序停止:

```bash
# 1. 停止前端 (Ctrl + C)
# 2. 停止后端 (Ctrl + C)

# 3. 停止 Docker 容器
docker-compose down

# 如果需要清除所有数据
docker-compose down -v
```
