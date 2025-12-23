# 前端 Dockerfile
FROM node:18-alpine AS base

# 依赖安装阶段
FROM base AS dependencies
WORKDIR /app

# 复制 package.json 文件
COPY package.json package-lock.json* ./
COPY packages/client/package.json ./packages/client/
COPY packages/shared/package.json ./packages/shared/

# 安装依赖
RUN npm ci

# 构建阶段
FROM base AS build
WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./

# 复制源代码
COPY packages/shared ./packages/shared
COPY packages/client ./packages/client
COPY tsconfig.json ./

# 构建 shared 包
RUN npm run build --workspace=packages/shared

# 构建前端应用
# 注意：生产环境需要设置正确的 API 地址
ARG VITE_API_URL=http://your-server-ip:3001
ARG VITE_WS_URL=ws://your-server-ip:3001/ws
ARG VITE_API_BASE=http://your-server-ip:3001/api/game

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_API_BASE=$VITE_API_BASE

WORKDIR /app/packages/client
RUN npm run build

# Nginx 生产阶段
FROM nginx:alpine AS production

# 复制自定义 nginx 配置
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制静态文件
COPY --from=build /app/packages/client/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
