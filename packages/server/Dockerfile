# 后端 Dockerfile
FROM node:18-alpine AS base

# 构建阶段
FROM base AS build
WORKDIR /app

# 安装编译工具（bcrypt 等原生模块需要）
RUN apk add --no-cache python3 make g++

# 配置 npm 使用淘宝镜像加速（国内服务器）
RUN npm config set registry https://registry.npmmirror.com

# 复制 package.json 文件（优化缓存）
COPY package.json package-lock.json* ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/game-engine/package.json ./packages/game-engine/package.json
COPY packages/games/package.json ./packages/games/package.json

# 安装所有依赖（包括 devDependencies）
# 使用 npm ci 更快且更可靠
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# 复制源代码（放在依赖安装之后，优化缓存）
COPY packages ./packages

# 重新安装依赖以建立正确的符号链接
RUN echo "=== Re-installing dependencies with source code ===" && \
    npm install

# 构建所有包（按依赖顺序，添加详细日志）
RUN echo "=== Building packages ===" && \
    npm run build --workspace=packages/shared && \
    echo "✓ shared build OK" && \
    npm run build --workspace=packages/game-engine && \
    echo "✓ game-engine build OK" && \
    npm run build --workspace=packages/games && \
    echo "✓ games build OK" && \
    npm run build --workspace=packages/server && \
    echo "✓ server build OK"

# 验证并调整构建产物结构
RUN echo "=== Verifying build outputs ===" && \
    test -f packages/shared/dist/index.js && echo "✓ shared verified" && \
    test -f packages/game-engine/dist/index.js && echo "✓ game-engine verified" && \
    echo "=== Flattening games dist structure ===" && \
    if [ -d packages/games/dist/games/src ]; then \
        cp -r packages/games/dist/games/src/* packages/games/dist/ && \
        rm -rf packages/games/dist/games && \
        echo "✓ games structure flattened"; \
    fi && \
    if [ -d packages/games/dist/shared ]; then \
        rm -rf packages/games/dist/shared && \
        echo "✓ games cleaned shared dir"; \
    fi && \
    test -f packages/games/dist/index.js && echo "✓ games verified" && \
    echo "=== Checking server build structure ===" && \
    ls -la packages/server/dist/ && \
    find packages/server/dist -name "index.js" -type f && \
    echo "=== Cleaning server dependency dirs ===" && \
    rm -rf packages/server/dist/server packages/server/dist/game-engine packages/server/dist/games packages/server/dist/shared packages/server/dist/packages && \
    echo "✓ server cleaned dependency dirs" && \
    test -f packages/server/dist/index.js && echo "✓ server verified" || \
    (echo "ERROR: Build verification failed" && exit 1)

WORKDIR /app

# 生产阶段
FROM base AS production
WORKDIR /app

# 安装生产运行时依赖（bcrypt 需要）
RUN apk add --no-cache python3 make g++

# 配置 npm 使用淘宝镜像加速
RUN npm config set registry https://registry.npmmirror.com

# 复制 package.json 文件
COPY package.json package-lock.json* ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/game-engine/package.json ./packages/game-engine/package.json
COPY packages/games/package.json ./packages/games/package.json

# 从构建阶段复制编译后的文件（在 npm install 之前）
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/game-engine/dist ./packages/game-engine/dist
COPY --from=build /app/packages/games/dist ./packages/games/dist

# 安装生产依赖（npm workspaces 会自动创建符号链接）
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# 清理 npm 缓存减小镜像体积
RUN npm cache clean --force

# 清理构建工具以减小镜像
RUN apk del python3 make g++

# 创建数据目录并设置权限
RUN mkdir -p /app/data/avalon && \
    chmod -R 777 /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["node", "packages/server/dist/index.js"]
