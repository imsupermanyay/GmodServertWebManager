# GmodServerManager 项目上下文备忘录

## 1. 服务器环境

- 操作系统：Debian Linux
- 管理面板：1Panel（用于管理 Docker 应用）
- 服务器公网 IP：42.121.120.120
- WireGuard 内网 IP：10.66.6.1（服务端）
- 本地开发机 WireGuard IP：10.66.6.2（Windows）
- 项目部署目录：`/opt/owgmod`（从 GitHub 仓库 clone）
- 本地开发目录：`D:\MyFile\Gmod\GmodServerManager`
- GitHub 仓库：`git@github.com:imsupermanyay/GmodServertWebManager.git`（分支：newweb）

### Docker 容器（由 1Panel 管理）
- MySQL 8.4.8：容器名 `1Panel-mysql-aT84`，端口 `127.0.0.1:3306`
- Gitea：容器名 `1Panel-gitea-MKNZ`，端口 `10.66.6.1:3000`（Web）+ `10.66.6.1:222`（SSH，映射到容器内 22）
- 游戏服务器容器：由管理平台动态创建，端口 27015 自动分配

### 宿主机直接运行的服务（计划用 PM2 管理）
- 后端 NestJS：端口 3001，目录 `/opt/owgmod/backend`
- 前端 Vue3：开发模式端口 5173，生产用 Nginx 托管

### 数据库
- MySQL 用户 `gmod_user`，需要 `'%'` 的 host 授权（因为从宿主机通过 TCP `127.0.0.1` 连接 Docker 内的 MySQL）
- MySQL 中 `localhost` 走 Unix socket，`127.0.0.1` 走 TCP，这是两种不同的连接方式
- 数据库名：`gmod_manager`
- DB_ROOT_PASSWORD：Lq030522

## 2. 网络链路与安全架构

### UFW 防火墙规则
```
22/tcp          ALLOW IN    Anywhere          # SSH（仅密钥登录，禁用密码）
51820/udp       ALLOW IN    Anywhere          # WireGuard VPN 端口
Anywhere        ALLOW IN    10.66.6.0/24      # WG 内网整段可访问（前端网站等）
3000            ALLOW IN    10.66.6.2         # Gitea Web - 仅我可访问
222             ALLOW IN    10.66.6.2         # Gitea SSH - 仅我可访问
3306            ALLOW IN    10.66.6.2         # MySQL - 仅我可访问（DataGrip 用）
```

### 访问层级
```
公网（所有人）：
  └─ 游戏端口 27015 等（Docker 容器直接暴露，绕过 ufw）
  └─ SSH 22（仅密钥认证）
  └─ WireGuard 51820

WireGuard 内网（所有 WG 用户）：
  └─ 前端管理网站
  └─ 后端 API（前端通过它操作服务器）

仅管理员 10.66.6.2（只有我）：
  └─ Gitea Web 10.66.6.1:3000
  └─ Gitea SSH 10.66.6.1:222
  └─ MySQL 127.0.0.1:3306（通过 DataGrip SSH 隧道访问）
```

### 关键网络知识点
- Docker 容器内 `127.0.0.1` 指的是容器自己，不是宿主机
- Gitea 绑定在 `10.66.6.1`（WG 接口），服务器本机访问也用这个 IP（本地回环不受 ufw 限制）
- 后端 webhook 同步时，服务器本地通过 HTTP `http://10.66.6.1:3000` 访问 Gitea
- 服务器上 clone Gitea 仓库用 HTTP 方式：`git clone http://10.66.6.1:3000/用户名/仓库.git`

## 3. 业务结构

### 项目概述
GmodServerManager 是一个 Garry's Mod 游戏服务器管理平台。通过 Web 界面管理多个 GMOD 服务器实例，每个实例跑在独立的 Docker 容器里。

### 技术栈
- 后端：NestJS + TypeScript + TypeORM + MySQL + JWT
- 前端：Vue 3 + Pinia + TailwindCSS + Axios
- 容器管理：Dockerode（Node.js Docker API）
- 代码同步：Gitea + Webhook

### 角色系统
- SUPER_ADMIN（超级管理员）：创建/管理用户、创建/删除实例、配置模式、管理所有功能
- ADMIN（普通管理员）：只能操作分配给自己的实例（启停、看日志、管理文件、上传 build 文件）

### 核心功能模块

#### 实例管理（游戏服务器）
- 创建实例 → 创建 Docker 容器（基于 lacledeslan/steamcmd 镜像）
- 容器内用 screen 会话运行 GMOD 服务器进程（srcds_run）
- 启动/停止/重启容器和服务器进程是两层操作
- 全局限制：同一时间只允许运行一个 GMOD 服务器
- 实时日志查看、CPU/内存/网络监控
- 容器内可执行命令（通过 screen 发送到服务器控制台）

#### 目录架构与软链接
```
/opt/gmodserver/         # 实例目录（系统自动管理）
  ├── server1 → /opt/allgamemodes/scp   # 软链接到模式目录
  ├── server2 → /opt/allgamemodes/scp   # 多个服务器共享同一模式
  └── server3/           # 未绑定模式的独立目录

/opt/allgamemodes/       # 模式文件根目录
  ├── scp_core/          # 核心代码（Git 仓库，私密）
  ├── scp_build/         # 构建素材（本地目录，前端上传）
  ├── scp_dev/           # 开发测试版（Git 仓库，core + build 合并）
  └── scp_online/        # 线上正式版（Git 仓库）

/opt/allserverdata/      # 服务器数据目录（每实例独立）
  ├── server1_data/      # 挂载到容器 /opt/steam/garrysmod/data
  └── server2_data/
```

#### Docker 挂载关系
创建实例时指定 hostDirectory 和 containerDirectory：
- `hostDirectory`（如 `/opt/gmodserver/server1`）→ 挂载到容器内 `containerDirectory`（如 `/opt/steam/garrysmod/addons`）
- 数据目录自动创建：`/opt/allserverdata/{实例名}_data` → 容器内 `/opt/steam/garrysmod/data`
- 软链接在宿主机层面操作：`/opt/gmodserver/server1` 软链接到 `/opt/allgamemodes/scp`
- 效果：容器内 addons 目录实际读取的是模式目录的文件，多个服务器共享同一套 addons

#### 模式管理（Gamemodes 页面）
- 注册模式的 Git 仓库信息（name、coreDir、buildDir、devDir、onlineDir + 仓库地址）
- 配合 Webhook 自动同步系统使用
- 与"模式链接"是两套不同功能

#### 模式链接（ModeLinks 页面）
- 运维层面：把 `/opt/gmodserver/{实例名}` 软链接到 `/opt/allgamemodes/{模式名}`
- 绑定/解绑操作
- 让多个服务器实例共享同一套模式文件

#### 文件同步系统（Webhook + 手动同步）

自动同步流程（core push 触发）：
1. 开发者 push 代码到 Gitea 的 `scp_core` 仓库
2. Gitea 发 webhook POST 到 `http://后端:3001/api/webhooks/gitea`
3. 后端检测到是 `_core` 仓库的 push 事件
4. 自动 `git fetch + reset --hard` 拉取 `/opt/allgamemodes/scp_core` 最新代码
5. 清空 `scp_dev` 目录（保留 .git）
6. 先 rsync `scp_build` 到 `scp_dev`（素材优先）
7. 再 rsync `scp_core` 覆盖到 `scp_dev`（核心代码优先级更高）
8. 自动 `git add -A` → `git commit` → `git push origin HEAD` 推送 dev 仓库

手动同步（前端"文件同步管理"页面）：
- 点击"手动同步到测试服"，选择模式，执行同一套合并逻辑
- 适用于 build 目录更新后手动触发

注意：`_build` 仓库 push 不会自动触发同步，需要手动点击同步按钮
注意：`dev → online` 的推送功能目前代码中未实现，是预留功能

#### CFG 模板 & 启动项
- CFG 模板：可复用的 server.cfg 配置片段，写入容器 `/opt/steam/garrysmod/cfg/server.cfg`
- 启动项（Startup Options）：srcds_run 的命令行参数模板
- 实例可以绑定模板 + 自定义 CFG 叠加

#### 文件管理（双目录体系）
- Build 目录：模式的构建素材文件（读写，前端可上传/下载/删除）
- Data 目录：服务器运行数据（每实例独立，读写）
- 支持文件夹上传、批量下载为 ZIP
- 路径安全校验防止目录穿越

## 4. 快速上手指南

### 开服标准流程
1. 在 Gitea 创建三个仓库：`{模式名}_core`、`{模式名}_dev`、`{模式名}_online`
2. 在服务器 `/opt/allgamemodes/` 下 clone 这三个仓库 + 创建 `{模式名}_build` 空目录
3. 在 Gitea 的 `_core` 仓库设置 Webhook → `http://10.66.6.1:3001/api/webhooks/gitea`
4. 在管理平台"模式管理"页面新增模式，填写四个目录路径和仓库地址
5. 在管理平台创建服务器实例（会创建 Docker 容器）
6. 在"模式链接"页面把实例绑定到模式目录
7. 配置启动项和 CFG 模板
8. 启动容器 → 启动服务器

### 日常开发流程
1. 开发者改代码 push 到 `_core` → 自动同步到 `_dev`
2. 管理员上传素材到 `_build` → 手动点同步 → 合并到 `_dev`
3. 测试服（绑定 `_dev`）验证
4. 确认无误后，手动将 `_dev` 推送到 `_online`（功能待实现）

### 本地开发连接
- SSH config 中 `Host gitea` 指向 `10.66.6.1:222`，使用 `id_ed25519_gitea` 密钥
- Git remote 格式：`git@gitea:用户名/仓库名.git`
- 前端 `.env` 中 `VITE_API_BASE_URL=http://10.66.6.1:3001`
- 后端 `.env` 中 `DB_HOST=127.0.0.1`（宿主机通过 TCP 连 Docker MySQL）

### 已知注意事项
- MySQL 用户必须有 `'%'` host 授权，`localhost` 和 `127.0.0.1` 在 MySQL 中是不同的
- 前端 API 的 baseURL 不要硬编码 IP，用环境变量或相对路径
- Docker 容器内 127.0.0.1 ≠ 宿主机，跨容器通信需要用容器名或宿主机 IP
- Gitea SSH 容器内监听 22，宿主机映射为 222（compose 中 `222:22`）
- 超级管理员默认账号由 `.env` 中 `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` 控制
