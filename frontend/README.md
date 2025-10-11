# GMOD 服务器管理平台 - 前端

基于 Vue3 + TypeScript + Element Plus 的 GMOD 服务器管理前端应用。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - JavaScript 的超集
- **Vite** - 下一代前端构建工具
- **Element Plus** - Vue 3 UI 组件库
- **Vue Router** - Vue.js 官方路由
- **Pinia** - Vue 状态管理库
- **Axios** - HTTP 客户端

## 功能特性

### 超级管理员功能
- 用户管理 (创建、编辑、删除用户)
- 实例管理 (创建、配置、启动、停止服务器实例)
- 仓库管理 (Git 仓库克隆、拉取更新)
- 绑定管理 (实例与仓库的绑定、批量绑定)
- 审计日志 (操作记录查询、导出)
- 数据统计仪表盘

### 普通管理员功能
- 我的实例 (查看分配的实例)
- 实例控制 (启动、停止、重启)
- 实时日志查看
- 控制台命令执行
- 仓库同步

## 目录结构

```
frontend/
├── src/
│   ├── api/              # API 接口
│   │   ├── index.ts      # Axios 配置
│   │   ├── auth.ts       # 认证 API
│   │   ├── users.ts      # 用户 API
│   │   ├── instances.ts  # 实例 API
│   │   ├── repos.ts      # 仓库 API
│   │   ├── bindings.ts   # 绑定 API
│   │   └── audits.ts     # 审计 API
│   ├── components/       # 公共组件
│   │   ├── InstanceCard.vue
│   │   └── StatusBadge.vue
│   ├── layouts/          # 布局组件
│   │   ├── AdminLayout.vue
│   │   └── UserLayout.vue
│   ├── stores/           # Pinia 状态管理
│   │   ├── index.ts
│   │   └── auth.ts
│   ├── router/           # 路由配置
│   │   └── index.ts
│   ├── views/            # 页面组件
│   │   ├── Login.vue
│   │   ├── admin/        # 管理员页面
│   │   │   ├── Dashboard.vue
│   │   │   ├── Users.vue
│   │   │   ├── Instances.vue
│   │   │   ├── Repos.vue
│   │   │   ├── Bindings.vue
│   │   │   └── Audits.vue
│   │   └── user/         # 用户页面
│   │       ├── MyInstances.vue
│   │       └── InstanceDetail.vue
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 开发环境设置

### 前置要求
- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
cd frontend
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录

### 预览生产构建

```bash
npm run preview
```

## 环境配置

默认 API 地址: `http://localhost:3001/api`

可在 `vite.config.ts` 中修改代理配置:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

## 主要特性

### 路由守卫
- 自动检查登录状态
- 基于角色的权限控制
- 未登录自动跳转登录页

### API 拦截器
- 统一错误处理
- 自动携带 Session Cookie
- 401 自动跳转登录

### 深色主题
- 专业的深色配色方案
- 统一的 UI 风格
- 优化的视觉体验

### 实时更新
- 实例状态实时刷新
- 日志自动更新
- 操作即时反馈

## 默认账号

请联系后端管理员获取登录凭证。

## 浏览器支持

- Chrome (推荐)
- Firefox
- Edge
- Safari

## 许可证

MIT
