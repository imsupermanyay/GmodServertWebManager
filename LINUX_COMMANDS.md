# Linux 测试命令速查表

> 复制粘贴即可，按顺序执行

---

## 📤 第一步: Windows 推送代码

```powershell
cd D:\MyFile\Gmod\GmodServerManager
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/GmodServerManager.git
git push -u origin main
```

---

## 🖥️ 第二步: Linux 安装环境 (只需一次)

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 安装工具
sudo apt install -y git vim curl

# 重新登录
exit
# 重新 SSH 连接
```

---

## 📦 第三步: 克隆代码

```bash
# 创建目录
sudo mkdir -p /opt/gmod-manager
sudo chown -R $USER:$USER /opt/gmod-manager
cd /opt/gmod-manager

# 克隆代码 (替换成你的仓库)
git clone https://github.com/你的用户名/GmodServerManager.git .

# 创建数据目录
sudo mkdir -p /srv/bare /srv/allcode /srv/instances
sudo chown -R $USER:$USER /srv
```

---

## ⚙️ 第四步: 配置后端

```bash
cd /opt/gmod-manager/backend
cp .env.example .env
vim .env
```

**编辑 .env** (按 `i` 编辑，`:wq` 保存):
```env
DOCKER_SOCKET_PATH=/var/run/docker.sock
BARE_REPO_ROOT=/srv/bare
ALLCODE_ROOT=/srv/allcode
INSTANCES_ROOT=/srv/instances
CORS_ORIGIN=http://localhost:5173
```

---

## 🚀 第五步: 启动服务

### 启动数据库 (终端 1)

```bash
cd /opt/gmod-manager
docker-compose up -d mysql redis

# 等待 30 秒，查看日志
docker logs -f gmod-manager-mysql
# 看到 "ready for connections" 后按 Ctrl+C
```

### 启动后端 (终端 1)

```bash
cd /opt/gmod-manager/backend
npm install
npm run start:dev

# 看到 "Application is running" 就成功了
# 保持运行，不要关闭
```

### 启动前端 (新开终端 2)

```bash
# 新开一个 SSH 连接
ssh root@你的服务器IP

cd /opt/gmod-manager/frontend
npm install
npm run dev

# 看到 "Local: http://localhost:5173" 就成功了
# 保持运行，不要关闭
```

---

## 🔥 第六步: 开放防火墙 (新开终端 3)

```bash
# 新开第三个 SSH 连接
ssh root@你的服务器IP

sudo ufw allow 5173/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

---

## ✅ 第七步: 访问测试

浏览器打开:
```
http://你的服务器IP:5173
```

登录:
- 用户名: `admin`
- 密码: `admin123`

---

## 🧪 快速测试命令

```bash
# 查看容器
docker ps

# 查看数据库
docker exec -it gmod-manager-mysql mysql -u gmod_user -pgmod_password -e "USE gmod_manager; SELECT * FROM users;"

# 测试 API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 查看目录
ls -la /srv/
ls -la /opt/gmod-manager/
```

---

## 🔄 更新代码

```bash
# Windows 推送
cd D:\MyFile\Gmod\GmodServerManager
git add .
git commit -m "更新说明"
git push

# Linux 拉取
cd /opt/gmod-manager
git pull

# 重启后端 (在后端终端按 Ctrl+C，然后)
npm run start:dev

# 重启前端 (在前端终端按 Ctrl+C，然后)
npm run dev
```

---

## 🛑 停止服务

```bash
# 停止前后端: 在对应终端按 Ctrl+C

# 停止 Docker
cd /opt/gmod-manager
docker-compose down
```

---

## 🐛 常见问题

```bash
# 端口被占用
sudo netstat -tulpn | grep :5173
sudo kill -9 <PID>

# 重启 MySQL
docker restart gmod-manager-mysql

# 清除 node_modules
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 文件位置

```
/opt/gmod-manager/          # 项目代码
  ├── backend/              # 后端
  ├── frontend/             # 前端
  └── docker-compose.yml

/srv/                       # 数据目录
  ├── bare/                 # Git 裸仓库
  ├── allcode/              # Git worktrees
  └── instances/            # GMOD 实例
```

---

**就这么简单!** 🎉
