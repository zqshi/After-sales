# ================================
# 多阶段构建 - 后端服务
# ================================

# 阶段1: 开发环境
FROM node:18-alpine AS development

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 8080

# 开发模式命令
CMD ["npm", "run", "dev"]

# ================================
# 阶段2: 构建阶段
# ================================
FROM node:18-alpine AS build

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建TypeScript
RUN npm run build

# 移除开发依赖
RUN npm prune --production

# ================================
# 阶段3: 生产环境
# ================================
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从构建阶段复制必要文件
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 生产模式命令
CMD ["node", "dist/server.js"]
