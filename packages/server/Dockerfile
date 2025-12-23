# 后端 Dockerfile
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS dependencies
WORKDIR /app

# 复制 package.json 文件
COPY package.json package-lock.json* ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/game-engine/package.json ./packages/game-engine/

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm install

# 构建阶段
FROM base AS build
WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./

# 复制源代码
COPY packages/shared ./packages/shared
COPY packages/game-engine ./packages/game-engine
COPY packages/server ./packages/server
COPY games ./games

# 构建所有包
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/game-engine
RUN npm run build --workspace=packages/server

# 编译 Avalon 游戏逻辑
WORKDIR /app/games/avalon
RUN npx tsc avalon-game.ts --skipLibCheck --module commonjs --target es2020 --outDir . --resolveJsonModule --esModuleInterop

# 生产阶段
FROM base AS production
WORKDIR /app

# 只安装生产依赖
COPY package.json package-lock.json* ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/game-engine/package.json ./packages/game-engine/

RUN npm install --omit=dev

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
