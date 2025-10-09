# 项目结构说明

## 完整文件树

```
frontend/
├── .gitignore                          # Git 忽略文件配置
├── .env.example                        # 环境变量示例
├── package.json                        # 项目依赖配置
├── tsconfig.json                       # TypeScript 配置
├── tsconfig.node.json                  # TypeScript Node 配置
├── vite.config.ts                      # Vite 构建配置
├── index.html                          # HTML 入口文件
├── README.md                           # 项目说明文档
├── GETTING_STARTED.md                  # 快速开始指南
├── PROJECT_STRUCTURE.md                # 项目结构说明(当前文件)
│
└── src/                                # 源代码目录
    ├── main.ts                         # 应用入口文件
    ├── App.vue                         # 根组件
    ├── vite-env.d.ts                   # Vite 类型声明
    │
    ├── api/                            # API 接口层
    │   ├── index.ts                    # Axios 实例配置、拦截器
    │   ├── auth.ts                     # 认证相关 API (登录、登出、获取用户信息)
    │   ├── users.ts                    # 用户管理 API (CRUD 操作)
    │   ├── instances.ts                # 实例管理 API (CRUD、启动、停止、日志等)
    │   ├── repos.ts                    # 仓库管理 API (CRUD、克隆、拉取)
    │   ├── bindings.ts                 # 绑定管理 API (CRUD、同步、批量操作)
    │   └── audits.ts                   # 审计日志 API (查询、导出)
    │
    ├── stores/                         # Pinia 状态管理
    │   ├── index.ts                    # Pinia 实例导出
    │   └── auth.ts                     # 认证状态 (用户信息、登录状态、权限)
    │
    ├── router/                         # Vue Router 路由
    │   └── index.ts                    # 路由配置、路由守卫
    │
    ├── components/                     # 公共组件
    │   ├── StatusBadge.vue             # 状态标签组件 (运行中/已停止)
    │   └── InstanceCard.vue            # 实例卡片组件 (展示+操作)
    │
    ├── layouts/                        # 布局组件
    │   ├── AdminLayout.vue             # 超级管理员布局 (侧边栏菜单)
    │   └── UserLayout.vue              # 普通管理员布局 (顶部菜单)
    │
    └── views/                          # 页面组件
        ├── Login.vue                   # 登录页面
        │
        ├── admin/                      # 超级管理员页面
        │   ├── Dashboard.vue           # 仪表盘 (统计数据、活动记录)
        │   ├── Users.vue               # 用户管理 (增删改查)
        │   ├── Instances.vue           # 实例管理 (增删改查、启停控制)
        │   ├── Repos.vue               # 仓库管理 (增删改查、克隆、拉取)
        │   ├── Bindings.vue            # 绑定管理 (增删改查、批量绑定、同步)
        │   └── Audits.vue              # 审计日志 (查询、筛选、导出)
        │
        └── user/                       # 普通管理员页面
            ├── MyInstances.vue         # 我的实例 (实例列表、快速控制)
            └── InstanceDetail.vue      # 实例详情 (详细信息、日志、命令、绑定)
```

## 文件说明

### 配置文件

| 文件 | 说明 |
|------|------|
| `package.json` | 项目依赖、脚本命令 |
| `vite.config.ts` | Vite 构建工具配置、开发服务器、代理 |
| `tsconfig.json` | TypeScript 编译器配置 |
| `.gitignore` | Git 版本控制忽略规则 |
| `.env.example` | 环境变量示例 |

### 核心文件

| 文件 | 说明 |
|------|------|
| `index.html` | HTML 模板，应用挂载点 |
| `src/main.ts` | 应用入口，注册插件、挂载应用 |
| `src/App.vue` | 根组件，提供全局配置和路由视图 |

### API 层 (`src/api/`)

所有 API 模块都遵循相同的模式:
1. 定义 TypeScript 接口
2. 导出 API 函数
3. 使用统一的 axios 实例

**特点:**
- 完整的类型定义
- 统一的错误处理
- 自动携带 Session

### 状态管理 (`src/stores/`)

使用 Pinia 进行状态管理:
- `auth.ts`: 用户认证状态、登录信息、权限判断

**扩展建议:**
可根据需要添加更多 store，例如:
- `instance.ts`: 实例状态缓存
- `system.ts`: 系统配置

### 路由配置 (`src/router/`)

**路由结构:**
```
/login                    登录页
/admin                    超级管理员布局
  ├── /dashboard          仪表盘
  ├── /users              用户管理
  ├── /instances          实例管理
  ├── /repos              仓库管理
  ├── /bindings           绑定管理
  └── /audits             审计日志
/user                     普通管理员布局
  ├── /instances          我的实例
  └── /instances/:id      实例详情
```

**路由守卫:**
- 检查登录状态
- 验证用户角色
- 自动重定向

### 组件 (`src/components/`)

**StatusBadge.vue**
- 显示实例运行状态
- 支持自定义样式

**InstanceCard.vue**
- 卡片式展示实例信息
- 集成控制按钮
- 支持状态刷新

### 布局 (`src/layouts/`)

**AdminLayout.vue**
- 侧边栏菜单导航
- 顶部用户信息
- 页面标题显示

**UserLayout.vue**
- 顶部水平菜单
- 简洁的用户界面
- 适合普通管理员

### 页面组件 (`src/views/`)

#### 超级管理员页面

**Dashboard.vue**
- 统计卡片 (用户、实例、仓库数量)
- 最近活动时间线
- 系统信息展示

**Users.vue**
- 用户列表表格
- 创建/编辑用户对话框
- 角色分配

**Instances.vue**
- 实例列表表格
- 完整的 CRUD 操作
- 启动/停止/重启控制

**Repos.vue**
- 仓库列表表格
- Git 克隆和拉取功能
- 仓库状态查看

**Bindings.vue**
- 绑定列表表格
- 单个绑定创建
- 批量绑定功能
- 同步操作

**Audits.vue**
- 审计日志表格
- 高级筛选功能
- 日志导出

#### 普通管理员页面

**MyInstances.vue**
- 网格布局展示实例
- 使用 InstanceCard 组件
- 自动刷新状态

**InstanceDetail.vue**
- 实例详细信息
- 实时日志查看
- 控制台命令执行
- 绑定仓库列表
- 仓库同步功能

## 设计模式

### 组件通信
- Props down, Events up
- Pinia for global state
- Router for navigation

### 代码风格
- TypeScript strict mode
- Composition API
- SFC (Single File Component)

### 样式规范
- Scoped styles
- 深色主题配色
- Element Plus 组件库

## 扩展建议

### 添加新功能模块

1. **创建 API 模块**
   ```typescript
   // src/api/newModule.ts
   import api from './index'

   export interface NewData {
     // 类型定义
   }

   export const getNewData = () => {
     return api.get<any, NewData[]>('/new-endpoint')
   }
   ```

2. **创建页面组件**
   ```vue
   <!-- src/views/admin/NewPage.vue -->
   <template>
     <div class="new-page">
       <!-- 页面内容 -->
     </div>
   </template>
   ```

3. **添加路由**
   ```typescript
   // src/router/index.ts
   {
     path: 'new-page',
     name: 'NewPage',
     component: () => import('@/views/admin/NewPage.vue'),
     meta: { title: '新页面' }
   }
   ```

4. **更新导航菜单**
   ```vue
   <!-- src/layouts/AdminLayout.vue -->
   <el-menu-item index="/admin/new-page">
     <el-icon><Icon /></el-icon>
     <span>新页面</span>
   </el-menu-item>
   ```

### 性能优化建议

1. **路由懒加载**: 已实现
2. **组件懒加载**: 按需引入大型组件
3. **虚拟滚动**: 大数据列表使用虚拟滚动
4. **请求防抖**: 搜索、筛选操作添加防抖
5. **缓存策略**: 合理使用 keep-alive

## 最佳实践

1. **类型安全**: 充分利用 TypeScript 类型系统
2. **错误处理**: 使用统一的错误处理机制
3. **代码复用**: 提取公共逻辑到 composables
4. **注释规范**: 关键逻辑添加清晰注释
5. **测试覆盖**: 编写单元测试和集成测试

## 相关资源

- [Vue 3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Vite 文档](https://vitejs.dev/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Vue Router 文档](https://router.vuejs.org/)
