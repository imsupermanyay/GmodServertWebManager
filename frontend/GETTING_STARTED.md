# 快速开始指南

## 安装步骤

### 1. 安装依赖

在 `frontend` 目录下执行:

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 3. 确保后端服务运行

确保后端 API 服务在 http://localhost:3001 运行

## 项目特点

### 完整的类型支持
- 所有 API 接口都有 TypeScript 类型定义
- 完整的类型检查和智能提示

### 模块化设计
- API 层独立封装
- 组件复用性高
- 状态管理清晰

### 深色主题
- 专业的深色配色
- 护眼舒适
- 统一的 UI 风格

### 权限控制
- 路由级别权限控制
- 超级管理员和普通管理员分离
- 自动重定向

## 功能模块

### 超级管理员 (SUPER_ADMIN)

访问路径: `/admin/*`

1. **仪表盘** (`/admin/dashboard`)
   - 系统统计数据
   - 最近活动记录
   - 系统信息

2. **用户管理** (`/admin/users`)
   - 创建/编辑/删除用户
   - 角色分配

3. **实例管理** (`/admin/instances`)
   - 创建/配置服务器实例
   - 启动/停止/重启控制
   - 实例状态监控

4. **仓库管理** (`/admin/repos`)
   - 添加 Git 仓库
   - 克隆/拉取代码
   - 仓库状态查看

5. **绑定管理** (`/admin/bindings`)
   - 创建实例-仓库绑定
   - 批量绑定功能
   - 同步操作

6. **审计日志** (`/admin/audits`)
   - 操作记录查询
   - 日志筛选
   - 数据导出

### 普通管理员 (ADMIN)

访问路径: `/user/*`

1. **我的实例** (`/user/instances`)
   - 查看分配的实例
   - 实例卡片展示
   - 快速控制

2. **实例详情** (`/user/instances/:id`)
   - 详细信息查看
   - 实时日志监控
   - 控制台命令执行
   - 绑定仓库管理

## 开发提示

### API 请求配置

所有 API 请求配置在 `src/api/index.ts`:
- 自动携带 credentials (Session)
- 统一错误处理
- 401 自动跳转登录

### 添加新页面

1. 在 `src/views/` 创建组件
2. 在 `src/router/index.ts` 添加路由
3. 添加相应的权限检查

### 添加新 API

1. 在 `src/api/` 创建或编辑模块
2. 定义 TypeScript 接口
3. 导出 API 函数

### 状态管理

使用 Pinia 进行状态管理，当前只有 `auth` store:
- 用户信息
- 登录状态
- 角色权限

需要添加新的全局状态，在 `src/stores/` 创建新文件。

## 常见问题

### Q: 登录后白屏?
A: 检查浏览器控制台错误，确保后端 API 正常返回数据

### Q: API 请求失败?
A: 检查:
1. 后端服务是否运行
2. API 地址是否正确
3. 网络请求是否被拦截

### Q: 样式显示异常?
A: 清除浏览器缓存，重新加载页面

### Q: 如何修改 API 地址?
A: 修改 `vite.config.ts` 中的 proxy 配置

## 构建部署

### 开发环境
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

构建产物在 `dist/` 目录，可部署到任何静态服务器。

### 预览构建
```bash
npm run preview
```

## 技术支持

如有问题，请查看:
- README.md - 项目概述
- 代码注释 - 详细的代码说明
- Element Plus 文档 - https://element-plus.org
- Vue 3 文档 - https://vuejs.org
