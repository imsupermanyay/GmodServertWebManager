# GMOD 服务器运维与管理平台（Node.js + Vue3）执行方案

> 目标：交付一套包含**超级管理者（A）**与**服务器管理员（B）**两种角色的 Web 管理平台，实现 GMOD 游戏实例的创建、运维、代码仓库（Gitea）分支绑定与自动部署、实例生命周期控制及审计。后端采用 **Node.js（TypeScript）**，前端采用 **Vue3**。

---

## 1. 总体架构

- **前端（Vue3 + Vite + Pinia + Vue Router）**：
  - A 端：实例编排、账号管理、Gitea 仓库登记与分支绑定、全局监控与审计。
  - B 端：实例列表、启停重启、实时日志、启动项配置。
- **后端（Node.js/TypeScript）**：
  - 推荐框架：**NestJS**（结构化、可测试、AOP 与 DI 友好）。
  - 模块：认证鉴权、用户与角色、实例编排、Gitea 集成、Webhook、部署与任务队列、日志与审计、系统配置。
- **容器与实例运行时**：
  - **Docker** 运行 GMOD 服务器容器；
  - 后端通过 **dockerode** SDK 控制创建/启动/停止/重启，收集日志；
  - 以绑定卷（bind mount）方式把 `allcode/{repo}/{branch}` 软链接后的内容挂载到容器内 `garrysmod/addons`。
- **代码同步**：
  - 使用 **Gitea Webhook**（push/PR merge）触发后端任务；
  - 后端维护 **裸仓库（bare repo）+ worktree**，按分支在 `allcode/{repo}/{branch}` 准备工作树；
  - 每次事件触发：`git fetch` + 目标分支 worktree fast-forward 更新，原子替换软链接（`ln -sfn`）。
- **队列与任务**：
  - **BullMQ + Redis**：拉取代码、建立/更新 worktree、更新软链接、可选触发实例重启；
  - 任务幂等，失败重试 + 死信队列。
- **数据库**：
  - **PostgreSQL**（或 MySQL）；
  - 存储用户、角色、实例、仓库、分支绑定、令牌、审计、任务状态。
- **可观测性**：
  - WebSocket 实时日志；
  - 审计日志（谁在何时对哪个实例执行了什么动作）。

---

## 2. 目录与路径约定

- 平台宿主机关键路径（可配）：
  - 代码工作树根：`/srv/allcode/{repo}/{branch}`（repo 建议去掉特殊字符并下划线化）
  - 裸仓库根：`/srv/bare/{repo}.git`
  - 实例根目录：`/srv/instances/{instanceId}/`（容器数据卷与启动文件）
  - 实例 addons 软链目标：`/srv/instances/{instanceId}/garrysmod/addons/{repo}__{branch}`

> 软链策略：每个绑定创建一个以 `{repo}__{branch}` 命名的 symlink 指向 `/srv/allcode/{repo}/{branch}`，更新时使用 `ln -sfn` 原子切换；解绑时移除 symlink。

---

## 3. 数据模型（简化）

**users**
- id, username, email, password_hash, role (SUPER_ADMIN|ADMIN), is_active, created_at

**instances**
- id, name, owner_user_id, status (STOPPED|RUNNING|RESTARTING|ERROR), docker_container_name, port, query_port, rcon_port, map, gamemode, max_players, auto_restart_on_code_change (bool), created_at

**repos**
- id, name, gitea_http_url, gitea_ssh_url, default_branch, note, created_at

**bindings**
- id, repo_id, branch, instance_id, enabled (bool), created_at, updated_at

**webhook_secrets**
- id, repo_id, secret

**jobs**
- id, type (GIT_SYNC|INSTANCE_START|INSTANCE_STOP|INSTANCE_RESTART|LINK_REFRESH), payload(json), status, retry_count, last_error, created_at, updated_at

**audits**
- id, actor_user_id, action, target_type, target_id, payload(json), created_at

> 备注：A 角色可见全部；B 角色仅可见自己 `owner_user_id` 的实例与其绑定。

---

## 4. 权限与安全

- **认证**：JWT（Access + Refresh），密码使用 **bcrypt** 哈希。
- **鉴权**：基于角色（A/B）+ 资源级别（实例归属、绑定关系）。
- **Gitea Webhook 校验**：校验 `X-Gitea-Signature`（HMAC-SHA256），secret 存库。
- **Docker 安全**：
  - 后端仅能访问本机 Docker（/var/run/docker.sock，建议 rootless 或 socket-proxy）；
  - 容器限制：CPU/内存限制、只读根文件系统（除数据/日志目录）。
- **命令注入防护**：所有 SRCDS 启动参数白名单 + 转义；
- **审计**：所有管理动作与 webhook 触发均记录。

---

## 5. 关键流程

### 5.1 A：创建 GMOD 实例（Docker）
1) 表单：name、端口、地图、gamemode、max_players、镜像标签、是否随代码变更自动重启。
2) 后端：
   - 生成 `docker_container_name`，创建实例目录 `/srv/instances/{id}`；
   - 以参数启动容器（见第 7 节镜像），挂载：
     - `/srv/instances/{id}/garrysmod` -> `/app/garrysmod`（容器内）
     - `/srv/instances/{id}/logs` -> `/app/logs`
     - 每个绑定的 `allcode/{repo}/{branch}` 以 symlink 形式出现在 `garrysmod/addons` 下。
3) 返回实例详情并写审计。

### 5.2 A：登记 Gitea 仓库
1) 录入：仓库名、HTTP/SSH 地址、默认分支、备注、Webhook Secret。
2) 平台提示在 Gitea 仓库设置中添加 Webhook：URL=`/api/webhooks/gitea`, Content type=`application/json`, Secret=填写的 secret，Events=Push + PR merged。

### 5.3 A：绑定仓库分支到实例
1) 选择 repo、branch、instance。
2) 后端：
   - 若不存在裸仓库：`git clone --bare <repo_url> /srv/bare/{repo}.git`
   - 确保 worktree 路径 `/srv/allcode/{repo}/{branch}` 存在：
     ```bash
     git --git-dir=/srv/bare/{repo}.git fetch origin {branch}
     git --git-dir=/srv/bare/{repo}.git worktree add -f /srv/allcode/{repo}/{branch} origin/{branch}
     ```
   - 建立/刷新实例 symlink：
     ```bash
     ln -sfn /srv/allcode/{repo}/{branch} \
       /srv/instances/{instanceId}/garrysmod/addons/{repo}__{branch}
     ```
   - 记录 `bindings`。

### 5.4 Gitea 代码变更自动下拉
- Webhook 收到事件 -> 校验签名 -> 投递 `GIT_SYNC` 任务：
  1) `git --git-dir=/srv/bare/{repo}.git fetch --all --prune`
  2) `git --git-dir=/srv/bare/{repo}.git worktree list` 检查分支是否存在 worktree；
  3) 对每个受影响分支：
     - `git -C /srv/allcode/{repo}/{branch} reset --hard origin/{branch}`（或 `pull --ff-only`）；
     - **原子**刷新 symlink；
     - 若绑定的实例开启 `auto_restart_on_code_change`，投递 `INSTANCE_RESTART`。

### 5.5 B：实例运维
- **登录** -> **实例列表**（仅本人）：状态、端口、当前地图/模式、在线人数（可选通过服务器 query）。
- **启停重启**：对应投递队列任务（防止阻塞）。
- **实时日志**：后端 `docker logs -f` 通过 WebSocket 转发；支持关键字过滤与下载历史日志。
- **启动项设置**：表单配置并保存到实例；重启时组装命令行（第 7 节）。

---

## 6. 后端 API（示例）

- `POST /auth/login`：登录，返回 JWT。
- `GET /users`（A）：查看管理员账号；`POST /users` 创建；`PATCH /users/:id` 修改；`GET /users/:id/instances` 管辖实例。
- `POST /instances`（A）：创建实例；`GET /instances`（A/B 权限隔离）；`PATCH /instances/:id`；
  `POST /instances/:id/start|stop|restart`；`GET /instances/:id/logs/stream`（WS）。
- `POST /repos`（A）：登记仓库；`GET /repos`；`POST /repos/:id/bindings` 绑定分支到实例；`DELETE /bindings/:id` 解绑。
- `POST /webhooks/gitea`：接收推送/PR 合并事件。
- `GET /audits`（A）：审计列表。

**Webhook 验证（NestJS 伪代码）**
```ts
import * as crypto from 'crypto';

function verifyGiteaSignature(secret: string, rawBody: string, signature: string) {
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(signature));
}
```

---

## 7. GMOD 容器镜像与启动命令

**Dockerfile（示例，基于 steamcmd 安装 gmod 服务器）**
```Dockerfile
FROM debian:stable-slim
RUN apt-get update && apt-get install -y ca-certificates lib32gcc-s1 curl tar bash xz-utils && rm -rf /var/lib/apt/lists/*

# 安装 steamcmd
RUN useradd -m steam && mkdir -p /steamcmd && chown -R steam:steam /steamcmd
USER steam
WORKDIR /steamcmd
RUN curl -sSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz | tar -xz

# 安装/更新 gmod dedicated server （匿名即可；如遇权限问题可切换账号）
ENV GMOD_DIR=/app \
    SRCDS_APPID=4020
RUN ./steamcmd.sh +login anonymous +force_install_dir $GMOD_DIR \
    +app_update ${SRCDS_APPID} validate +quit

USER root
RUN mkdir -p /app/garrysmod/addons /app/logs && chown -R steam:steam /app
USER steam
WORKDIR /app

# 启动脚本
COPY --chown=steam:steam entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

**entrypoint.sh（示例）**
```bash
#!/usr/bin/env bash
set -euo pipefail

: "${GAMEMODE:=sandbox}"
: "${MAP:=gm_construct}"
: "${MAXPLAYERS:=16}"
: "${TICKRATE:=66}"
: "${PORT:=27015}"
: "${QUERY_PORT:=27016}"

exec ./srcds_run -game garrysmod \
  +gamemode "$GAMEMODE" \
  +maxplayers "$MAXPLAYERS" \
  +map "$MAP" \
  -tickrate "$TICKRATE" \
  -port "$PORT" \
  +hostport "$PORT" \
  +ip 0.0.0.0 \
  +sv_setsteamaccount ${STEAM_GSLT:-""}
```

**创建容器（后端调用 dockerode 等价于以下）**
```bash
docker run -d --name gmod_{instanceId} \
  -p 27015:27015/udp -p 27016:27016/udp \
  -e GAMEMODE=darkrp -e MAP=rp_downtown_v4c -e MAXPLAYERS=32 \
  -v /srv/instances/{id}/garrysmod:/app/garrysmod \
  -v /srv/instances/{id}/logs:/app/logs \
  --restart unless-stopped \
  gmod:latest
```

> 可按实例设置端口映射，防止冲突；必要时增加 RCON 端口与配置。

---

## 8. 前端页面与交互（Vue3）

- **登录页**（共用）：账号/密码 -> JWT；记住我；错误提示。
- **A 端**：
  - 仪表盘：实例总览、运行中/停止、最近审计。
  - 实例编排：新建/编辑/启停/参数配置，绑定列表展示。
  - 仓库登记：新增仓库、Webhook 指南（复制 URL/secret）。
  - 分支绑定：选择仓库+分支+实例，一键绑定，显示最近拉取状态与最后一次 commit。
  - 账号管理：创建/禁用/重置密码，查看账号管理的实例。
- **B 端**：
  - 我的实例：卡片/表格视图，启停重启按钮，状态标签。
  - 日志实时流：WebSocket，支持搜索关键词，支持导出。
  - 启动项设置：gamemode/map/max_players/端口等，可一键重启生效。

---

## 9. 任务与并发控制

- 同一仓库同一分支的 `GIT_SYNC` 任务 **串行** 执行（基于队列 key）；
- 同一实例的启停/重启动作 **串行** 执行；
- 失败自动重试（指数回退），超过上限标记失败并产生告警；
- 大文件仓库拉取：可启用浅克隆与 LFS 支持（如有）。

---

## 10. 运维与部署

- **配置**：`.env`（数据库、Redis、JWT、Gitea 基础地址等）。
- **CI/CD**：后端与前端分别打包为容器镜像；使用 Docker Compose 或 K8s 部署。
- **备份**：数据库定时备份；`/srv/bare` 与 `/srv/allcode` 采取快照或 rsync；
- **监控**：容器健康检查、实例在线探测、Webhook 处理延迟监控。

**docker-compose（平台服务示例）**
```yaml
version: "3.8"
services:
  api:
    image: gmod-platform-api:latest
    env_file: ./.env
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /srv:/srv
    depends_on: [db, redis]
    ports: ["8080:8080"]
  web:
    image: gmod-platform-web:latest
    ports: ["80:80"]
    depends_on: [api]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7
volumes:
  pgdata: {}
```

---

## 11. 边界与容错

- 分支删除：检测到 404 时将绑定标记为 `enabled=false` 并告警；
- 合并但分支重命名：跟随 webhook payload 中的 `ref` 实际值，必要时自动迁移 worktree 路径并刷新 symlink；
- 软链目标缺失：重建 worktree 后再恢复；
- 端口冲突：创建实例时做占用检测（宿主防火墙/iptables 或 docker 端口）；
- 大促/峰值 webhook：队列限流与批量合并（debounce N 秒）。

---

## 12. 开发计划（迭代）

**里程碑 M1（2 周）**：
- 基础用户体系（A/B），实例创建/启停/重启（Docker），日志流；
- 仓库登记、Webhook 通道、裸仓库+worktree 初始化、分支绑定与软链；
- Push 触发拉取与可选自动重启。

**里程碑 M2（1-2 周）**：
- 审计日志、实例在线探测、前端可视化完善；
- 启动项模板与参数校验、错误处理与重试策略。

**里程碑 M3（1 周）**：
- 多仓库多分支绑定、批量实例操作；
- 备份/恢复脚本、监控与告警接入。

---

## 13. 快速检查清单（上线前）

- [ ] Gitea Webhook 生效并成功触发 demo 仓库 push
- [ ] `bare` 与 `allcode` 目录权限正确，worktree 正常更新
- [ ] 实例容器参数校验与端口无冲突
- [ ] 软链原子替换验证通过，多实例共享一个分支正确
- [ ] 审计日志记录与导出
- [ ] 最小权限账户与强密码策略

---

## 14. 可选增强

- **在线玩家/心跳**：接入 Source Query 协议获取在线人数与地图信息；
- **LFS 与子模块**：如仓库使用 Git LFS 或子模块，队列任务里自动处理；
- **蓝绿/热更新**：双目录切换与下发 `changelevel` 降低重启影响；
- **实例模版**：预设启动参数一键创建相同配置。

---

> 如需，我可以在此基础上直接生成 **NestJS 后端脚手架** 与 **Vue3 管理台页面骨架**，以及 webhook 与队列的示例代码。

