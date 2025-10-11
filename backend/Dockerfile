# 后端 Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装 git (用于 Git worktree 操作)
RUN apk add --no-cache git

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "dist/main.js"]
