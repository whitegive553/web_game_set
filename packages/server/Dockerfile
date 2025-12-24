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

# 安装所有依赖（包括 devDependencies）
# 使用 npm ci 更快且更可靠
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# 复制源代码（放在依赖安装之后，优化缓存）
COPY packages ./packages
COPY games ./games

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

# 编译 Avalon 游戏逻辑（忽略类型错误，仅生成 JS）
WORKDIR /app/games/avalon
RUN npx tsc avalon-game.ts \
    --skipLibCheck \
    --noEmitOnError false \
    --module commonjs \
    --target es2020 \
    --outDir . \
    --resolveJsonModule \
    --esModuleInterop \
    --moduleResolution node || echo "TypeScript compilation completed with warnings" && \
    test -f avalon-game.js && echo "✓ avalon-game.js generated" || \
    (echo "ERROR: avalon-game.js not found" && exit 1)

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

# 从构建阶段复制编译后的文件（在 npm install 之前）
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/game-engine/dist ./packages/game-engine/dist
COPY --from=build /app/games ./games

# 安装生产依赖（npm workspaces 会自动创建符号链接）
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# 清理 npm 缓存减小镜像体积
RUN npm cache clean --force

# 清理构建工具以减小镜像
RUN apk del python3 make g++

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["node", "packages/server/dist/index.js"]
