# Linux 服务器测试指南

> 从 GitHub 拉取代码，直接在 Linux 服务器上启动和测试

---

## 📋 第一步: 上传代码到 GitHub

### 在 Windows 上操作

```powershell
# 打开 PowerShell，进入项目目录
cd D:\MyFile\Gmod\GmodServerManager

# 初始化 Git (如果还没有)
git init
git add .
git commit -m "Initial commit: GMOD Server Manager"
```

### 在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 仓库名: `GmodServerManager`
3. 可见性: Private (私有) 或 Public (公开)
4. **不要**勾选 "Initialize this repository with a README"
5. 点击 "Create repository"

### 推送代码

```powershell
# 添加远程仓库 (替换成你的用户名)
git remote add origin https://github.com/你的用户名/GmodServerManager.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

**完成！** 代码已上传到 GitHub。

---

## 🖥️ 第二步: 连接 Linux 服务器

### 使用 SSH 连接

```powershell
# Windows PowerShell 或 CMD
ssh root@你的服务器IP

# 或使用普通用户
ssh 用户名@你的服务器IP
```

### 首次连接可能需要输入密码

---

## 🔧 第三步: 安装环境 (只需一次)

### 1. 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. 安装 Node.js 18

```bash
# 添加 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装 Node.js
sudo apt install -y nodejs

# 验证安装
node -v   # 应该显示 v18.x.x
npm -v    # 应该显示 9.x.x
```

### 3. 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sudo sh

# 将当前用户添加到 docker 组 (避免每次都用 sudo)
sudo usermod -aG docker $USER

# 重新登录使权限生效
exit

# 重新 SSH 连接
ssh root@你的服务器IP

# 验证 Docker
docker -v
docker ps
```

### 4. 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose -v
```

### 5. 安装 Git

```bash
sudo apt install -y git vim curl
```

---

## 📦 第四步: 克隆代码

### 1. 创建项目目录

```bash
# 推荐部署到 /opt 目录
sudo mkdir -p /opt/gmod-manager
sudo chown -R $USER:$USER /opt/gmod-manager
cd /opt/gmod-manager
```

### 2. 克隆 GitHub 仓库

```bash
# 克隆代码 (替换成你的仓库地址)
git clone https://github.com/你的用户名/GmodServerManager.git .

# 如果是私有仓库，需要输入 GitHub 用户名和密码/Token

# 验证文件
ls -la

# 应该看到:
# backend/
# frontend/
# docker-compose.yml
# README.md
# 等文件
```

---

## ⚙️ 第五步: 配置环境

### 1. 创建必要的目录

```bash
# 创建数据目录
sudo mkdir -p /srv/bare /srv/allcode /srv/instances

# 修改所有者
sudo chown -R $USER:$USER /srv

# 验证
ls -ld /srv/*
```

### 2. 配置后端环境变量

```bash
cd /opt/gmod-manager/backend

# 复制环境变量模板
cp .env.example .env

# 编辑配置
vim .env
```

**按 `i` 进入编辑模式，修改以下内容**:

```env
NODE_ENV=development
PORT=3001

# 数据库配置
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=gmod_user
DB_PASSWORD=gmod_password
DB_DATABASE=gmod_manager

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=gmod-manager-secret-key-change-in-production

# Docker 配置 (Linux)
DOCKER_SOCKET_PATH=/var/run/docker.sock

# GMOD Docker 镜像
GMOD_IMAGE=hackebein/garrysmod:latest

# 文件路径
BARE_REPO_ROOT=/srv/bare
ALLCODE_ROOT=/srv/allcode
INSTANCES_ROOT=/srv/instances

# CORS (允许前端访问)
CORS_ORIGIN=http://localhost:5173
```

**按 `ESC`，输入 `:wq` 保存退出**

---

## 🚀 第六步: 启动服务

### 1. 启动 MySQL 和 Redis

```bash
cd /opt/gmod-manager

# 启动容器
docker-compose up -d mysql redis

# 查看容器状态
docker ps

# 应该看到两个容器:
# gmod-manager-mysql
# gmod-manager-redis
```

### 2. 等待 MySQL 启动完成

```bash
# 查看 MySQL 日志
docker logs -f gmod-manager-mysql

# 等待看到这一行:
# /usr/sbin/mysqld: ready for connections.
#
# 按 Ctrl+C 退出日志查看
```

### 3. 启动后端

```bash
cd /opt/gmod-manager/backend

# 安装依赖 (第一次需要,大约 2-3 分钟)
npm install

# 启动开发服务器
npm run start:dev

# 成功标志:
# 🚀 Application is running on: http://localhost:3001/api
# ✅ 默认管理员账户已创建: admin / admin123
```

**保持这个终端窗口运行!**

### 4. 启动前端 (新开一个 SSH 终端)

```bash
# 新开一个 SSH 连接
ssh root@你的服务器IP

# 进入前端目录
cd /opt/gmod-manager/frontend

# 安装依赖 (第一次需要,大约 2-3 分钟)
npm install

# 启动开发服务器
npm run dev

#需要自己创建数据库

  -- 创建数据库
  CREATE DATABASE IF NOT EXISTS gmod_manager CHARACTER SET utf8mb4 COLLATE
  utf8mb4_unicode_ci;

  -- 创建用户（如果已存在会报错，没关系）
  CREATE USER IF NOT EXISTS 'gmod_user'@'%' IDENTIFIED BY 'gmod_password';

  -- 授权
  GRANT ALL PRIVILEGES ON gmod_manager.* TO 'gmod_user'@'%';
  FLUSH PRIVILEGES;

  -- 验证
  SHOW DATABASES;
  SELECT User, Host FROM mysql.user WHERE User='gmod_user';

  -- 退出
  EXIT;

  2. 测试连接

  # 测试新用户
  docker exec -it 1Panel-mysql-KMtw mysql -u gmod_user -pgmod_password gmod_manager     


  # 测试 MySQL
  docker exec -it 1Panel-mysql-KMtw mysql -u gmod_user -pgmod_password -e "SHOW DATABASES;"

  # 应该看到:
  # +--------------------+
  # | Database           |
  # +--------------------+
  # | gmod_manager       |
  # | information_schema |
  # +--------------------+

  # 成功进入则说明配置正确
  # 输入 EXIT; 退出

#🔴 配置现有的 Redis

  1. 检查 Redis 是否有密码

  # 测试 Redis 连接
  docker exec -it 1Panel-redis-R64G redis-cli PING

  # 如果返回 PONG - 说明没有密码 ✅
  # 如果返回 NOAUTH - 说明有密码，需要找到密码

  2. 如果 Redis 有密码

  # 查看 Redis 容器的启动命令
  docker inspect 1Panel-redis-R64G | grep -A 10 Cmd

  # 或者查看 1Panel 配置找到密码

  然后在 backend/.env 中设置：

  REDIS_PASSWORD=你的redis密码

  ---

# 成功标志:
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://你的服务器IP:5173/
```

**保持这个终端窗口运行!**

---

## ✅ 第七步: 访问测试

### 1. 配置防火墙

```bash
# 新开第三个 SSH 终端
ssh root@你的服务器IP

# 开放端口
sudo ufw allow 5173/tcp   # 前端
sudo ufw allow 3001/tcp   # 后端
sudo ufw allow 3306/tcp   # MySQL (可选,仅用于调试)
sudo ufw allow 6379/tcp   # Redis (可选,仅用于调试)

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. 在浏览器访问

打开浏览器，访问:
```
http://你的服务器IP:5173
```

**应该看到登录页面!**

### 3. 登录测试

- **用户名**: `admin`
- **密码**: `admin123`

登录成功后应该进入管理后台!

---

## 🧪 第八步: 测试功能

### 测试 1: 创建用户

1. 左侧菜单点击 "用户管理"
2. 点击 "创建用户"
3. 填写信息:
   - 用户名: `testuser`
   - 邮箱: `test@example.com`
   - 密码: `test123456`
   - 角色: `ADMIN`
4. 点击"确定"
5. 应该在列表中看到新用户

### 测试 2: 查看数据库

```bash
# 进入 MySQL 容器
docker exec -it gmod-manager-mysql mysql -u gmod_user -p

# 输入密码: gmod_password

# 查看数据库
SHOW DATABASES;

# 使用数据库
USE gmod_manager;

# 查看表
SHOW TABLES;

# 查看用户
SELECT * FROM users;

# 应该看到 admin 和 testuser 两个用户

# 退出
EXIT;
```

### 测试 3: 测试 API 接口

```bash
# 测试登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c /tmp/cookies.txt

# 应该返回用户信息的 JSON

# 测试获取用户列表
curl http://localhost:3001/api/users \
  -b /tmp/cookies.txt

# 应该返回用户列表
```

### 测试 4: 测试 Docker 集成

```bash
# 拉取 GMOD 镜像
docker pull hackebein/garrysmod:latest

# 查看镜像
docker images | grep garrysmod
```

在管理后台:
1. 左侧菜单 → "实例管理"
2. 点击 "创建实例"
3. 填写:
   - 实例名称: `测试服务器1`
   - 端口: `27015`
   - 查询端口: `27016`
   - 地图: `gm_construct`
   - 游戏模式: `sandbox`
   - 最大玩家: `16`
   - 所有者: 选择一个用户
4. 点击"确定"

查看是否创建成功:
```bash
# 查看容器
docker ps -a | grep gmod

# 查看实例目录
ls -la /srv/instances/
```

### 测试 5: 测试 Git 功能

在管理后台:
1. 左侧菜单 → "仓库管理"
2. 点击 "登记仓库"
3. 填写测试仓库:
   - 仓库名称: `test-repo`
   - HTTP URL: `https://github.com/octocat/Hello-World.git`
   - 默认分支: `master`
   - 备注: `测试仓库`
4. 点击"确定"

查看是否克隆成功:
```bash
# 查看 bare 仓库
ls -la /srv/bare/

# 应该看到 test-repo.git 目录
```

---

## 📊 第九步: 查看日志和状态

### 查看后端日志

```bash
# 在运行后端的终端窗口，可以看到实时日志
# 或者查看历史日志 (如果用 PM2 运行)
```

### 查看 Docker 容器日志

```bash
# MySQL 日志
docker logs gmod-manager-mysql

# Redis 日志
docker logs gmod-manager-redis

# GMOD 实例日志
docker logs gmod_instance_1
```

### 查看系统资源

```bash
# 安装 htop
sudo apt install -y htop

# 查看 CPU 和内存
htop

# 查看 Docker 容器资源
docker stats
```

---

## 🐛 常见问题排查

### 问题 1: npm install 失败

```bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题 2: 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep :5173
sudo netstat -tulpn | grep :3001

# 结束占用进程
sudo kill -9 <PID>
```

### 问题 3: MySQL 连接失败

```bash
# 检查 MySQL 状态
docker ps | grep mysql

# 查看 MySQL 日志
docker logs gmod-manager-mysql

# 重启 MySQL
docker restart gmod-manager-mysql

# 等待 30 秒后重试
```

### 问题 4: Docker 权限问题

```bash
# 确保用户在 docker 组
sudo usermod -aG docker $USER

# 重新登录
exit
ssh root@你的服务器IP

# 测试
docker ps
```

### 问题 5: 前端无法连接后端

检查 `frontend/.env` 或 `vite.config.ts`:
```bash
cd /opt/gmod-manager/frontend
cat vite.config.ts

# 确保 proxy 配置正确:
# '/api': 'http://localhost:3001'
```

### 问题 6: 防火墙阻止访问

```bash
# 检查防火墙状态
sudo ufw status

# 如果端口未开放
sudo ufw allow 5173/tcp
sudo ufw reload
```

---

## 🔄 代码更新流程

### 当你在 Windows 修改代码后

```powershell
# Windows PowerShell
cd D:\MyFile\Gmod\GmodServerManager

git add .
git commit -m "修复了某个 bug"
git push
```

### 在 Linux 服务器拉取更新

```bash
# SSH 到服务器
ssh root@你的服务器IP

# 拉取最新代码
cd /opt/gmod-manager
git pull

# 如果修改了后端代码
cd backend
npm install  # 如果有新依赖
# Ctrl+C 停止旧的服务
npm run start:dev

# 如果修改了前端代码
cd frontend
npm install  # 如果有新依赖
# Ctrl+C 停止旧的服务
npm run dev
```

---

## 🛑 停止服务

### 停止前后端

```bash
# 在运行 npm run start:dev 或 npm run dev 的终端
# 按 Ctrl+C 停止
```

### 停止 Docker 容器

```bash
cd /opt/gmod-manager

# 停止容器
docker-compose down

# 停止并删除数据卷 (会清空数据库!!!)
docker-compose down -v
```

---

## 📝 测试完成清单

- [ ] 代码已上传到 GitHub
- [ ] 服务器环境已安装 (Node.js, Docker, Docker Compose)
- [ ] 代码已克隆到 `/opt/gmod-manager`
- [ ] `/srv` 目录已创建
- [ ] MySQL 和 Redis 容器正常运行
- [ ] 后端启动成功 (显示 "Application is running")
- [ ] 前端启动成功 (显示 "Local: http://localhost:5173")
- [ ] 浏览器可以访问登录页面
- [ ] 可以登录 admin / admin123
- [ ] 可以创建用户
- [ ] 数据库中可以看到用户数据
- [ ] 可以创建 GMOD 实例 (Docker 容器)
- [ ] 可以登记 Git 仓库

---

## 🎯 测试通过后

确认功能正常后，可以:

1. **继续开发**: 在 Windows 改代码 → 推送 GitHub → 服务器拉取测试
2. **生产部署**: 参考 `DEPLOY_DOCKER.md` 使用 Docker Compose 生产部署
3. **配置 Gitea**: 搭建 Gitea 并配置 Webhook 测试自动部署

---

## 💡 提示

### 多终端管理

建议开 3 个 SSH 终端:
- **终端 1**: 运行后端 (`npm run start:dev`)
- **终端 2**: 运行前端 (`npm run dev`)
- **终端 3**: 执行其他命令 (查看日志、测试 API 等)

### 使用 screen 或 tmux (可选)

```bash
# 安装 screen
sudo apt install -y screen

# 创建后端 session
screen -S backend
cd /opt/gmod-manager/backend
npm run start:dev
# 按 Ctrl+A 然后按 D 离开 (后台运行)

# 创建前端 session
screen -S frontend
cd /opt/gmod-manager/frontend
npm run dev
# 按 Ctrl+A 然后按 D 离开

# 查看所有 session
screen -ls

# 恢复 session
screen -r backend
screen -r frontend
```

---

**测试愉快!** 🚀

有问题随时查看本文档的"常见问题排查"部分!
