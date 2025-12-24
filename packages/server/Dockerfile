# 后端 Dockerfile
FROM node:18-alpine AS base

# 构建阶段
FROM base AS build
WORKDIR /app

# 安装编译工具（bcrypt 等原生模块需要）
RUN apk add --no-cache python3 make g++

# 复制整个项目（更可靠）
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY games ./games

# 安装所有依赖（包括 devDependencies）
RUN npm install

# 构建所有包（按依赖顺序，添加详细日志）
RUN echo "=== Building shared package ===" && \
    npm run build --workspace=packages/shared && \
    ls -la packages/shared/dist/ && \
    echo "=== Building game-engine package ===" && \
    npm run build --workspace=packages/game-engine && \
    ls -la packages/game-engine/dist/ && \
    echo "=== Building server package ===" && \
    npm run build --workspace=packages/server && \
    ls -la packages/server/dist/

# 验证所有构建产物并调整 server 输出结构
RUN echo "=== Verifying build outputs ===" && \
    test -f packages/shared/dist/index.js && echo "✓ shared build OK" && \
    test -f packages/game-engine/dist/index.js && echo "✓ game-engine build OK" && \
    echo "=== Checking server build structure ===" && \
    find packages/server/dist -name "index.js" -type f && \
    echo "=== Flattening server dist structure ===" && \
    if [ -d packages/server/dist/packages/server/src ]; then \
        cp -r packages/server/dist/packages/server/src/* packages/server/dist/ && \
        rm -rf packages/server/dist/packages && \
        rm -rf packages/server/dist/games && \
        echo "✓ server build structure fixed"; \
    fi && \
    test -f packages/server/dist/index.js && echo "✓ server build OK" || \
    (echo "ERROR: Build verification failed" && exit 1)

# 编译 Avalon 游戏逻辑
WORKDIR /app/games/avalon
RUN npx tsc avalon-game.ts --skipLibCheck --module commonjs --target es2020 --outDir . --resolveJsonModule --esModuleInterop

# 生产阶段
FROM base AS production
WORKDIR /app

# 安装生产运行时依赖（bcrypt 需要）
RUN apk add --no-cache python3 make g++

# 复制 package.json 文件
COPY package.json package-lock.json* ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/game-engine/package.json ./packages/game-engine/package.json

# 安装生产依赖
RUN npm install --omit=dev

# 清理构建工具以减小镜像（保留运行时依赖）
RUN apk del python3 make g++

# 从构建阶段复制编译后的文件
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/game-engine/dist ./packages/game-engine/dist
COPY --from=build /app/games ./games

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["node", "packages/server/dist/index.js"]
