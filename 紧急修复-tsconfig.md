# 紧急修复：tsconfig.json 文件不存在错误

## 错误信息

```
failed to solve: failed to compute cache key: failed to calculate checksum of ref 724cd978-2b45-4342-a2f6-50ace8583341::zziopj6vuoh5xwmyuzp1ckw0t: "/tsconfig.json": not found
[ERROR] 镜像构建失败，请检查日志
```

---

## 问题原因

Dockerfile 尝试复制根目录的 `tsconfig.json` 文件，但项目根目录没有这个文件。

每个子包（`packages/server`、`packages/client`、`packages/shared` 等）都有自己的 `tsconfig.json`，所以不需要复制根目录的配置文件。

---

## 已修复内容

✅ **packages/server/Dockerfile** - 删除了 `COPY tsconfig.json ./` 行
✅ **packages/client/Dockerfile** - 删除了 `COPY tsconfig.json ./` 行

---

## 立即部署步骤

### 方式 1：Git 更新（推荐）

```bash
# 1. SSH 连接服务器
ssh root@你的服务器IP

# 2. 进入项目目录
cd /opt/web_game_set/web_game_set

# 3. 拉取最新修复
git pull

# 4. 清理旧的构建缓存
docker system prune -f

# 5. 重新部署
./deploy.sh
```

### 方式 2：手动上传修复后的文件

```powershell
# 在本地 Windows PowerShell 执行

# 上传修复后的 Dockerfile
scp C:\aipengze\web_llm\packages\server\Dockerfile root@你的服务器IP:/opt/web_game_set/web_game_set/packages/server/
scp C:\aipengze\web_llm\packages\client\Dockerfile root@你的服务器IP:/opt/web_game_set/web_game_set/packages/client/
```

然后在服务器上：
```bash
cd /opt/web_game_set/web_game_set

# 清理旧的构建缓存
docker system prune -f

# 重新部署
./deploy.sh
```

### 方式 3：直接重新构建（最快）

```bash
cd /opt/web_game_set/web_game_set

# 停止服务
docker compose down

# 清理构建缓存（重要！）
docker builder prune -af

# 重新构建（不使用缓存）
docker compose build --no-cache

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

---

## 验证修复

### 1. 检查 Dockerfile

```bash
# 检查后端 Dockerfile
grep -n "tsconfig.json" /opt/web_game_set/web_game_set/packages/server/Dockerfile

# 检查前端 Dockerfile
grep -n "tsconfig.json" /opt/web_game_set/web_game_set/packages/client/Dockerfile

# 应该没有输出，说明已删除
```

### 2. 测试构建

```bash
cd /opt/web_game_set/web_game_set

# 只构建不启动
docker compose build

# 如果成功，会显示：
# Successfully built xxxxx
# Successfully tagged ...
```

---

## 完整部署流程（包含所有修复）

```bash
# 1. SSH 连接
ssh root@你的服务器IP

# 2. 进入项目
cd /opt/web_game_set/web_game_set

# 3. 拉取最新代码（包含所有修复）
git pull

# 4. 验证修复
echo "检查 Dockerfile 修复..."
! grep -q "COPY tsconfig.json" packages/server/Dockerfile && echo "✓ 后端 Dockerfile 已修复" || echo "✗ 后端需要修复"
! grep -q "COPY tsconfig.json" packages/client/Dockerfile && echo "✓ 前端 Dockerfile 已修复" || echo "✗ 前端需要修复"

# 5. 检查 docker-compose.yml
echo "检查 docker-compose.yml..."
! grep -q "^version:" docker-compose.yml && echo "✓ version 字段已删除" || echo "✗ 需要删除 version 字段"
grep -q "VITE_API_URL:" docker-compose.yml && echo "✓ args 格式正确" || echo "✗ args 格式需要修复"

# 6. 配置环境变量（如果还没有）
if [ ! -f .env ]; then
    cp .env.production .env
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)
    sed -i "s/your-super-secret-jwt-key-change-this-to-random-string/$JWT_SECRET/g" .env
    echo "✓ .env 文件已创建并配置"
fi

# 7. 清理旧的构建
echo "清理旧的构建缓存..."
docker system prune -f
docker builder prune -af

# 8. 运行部署脚本
echo "开始部署..."
chmod +x deploy.sh
./deploy.sh
```

---

## 常见问题

### Q: 为什么需要清理缓存？

Docker 构建会缓存每一层，如果之前构建失败，缓存可能包含错误状态。使用 `--no-cache` 或清理缓存可以确保从头开始构建。

### Q: 如何查看详细的构建日志？

```bash
# 构建时显示详细日志
docker compose build --progress=plain 2>&1 | tee build.log

# 查看日志文件
less build.log
```

### Q: 构建过程中可以中断吗？

可以，按 `Ctrl+C` 中断。重新运行命令会从上次中断的地方继续（如果使用缓存）。

### Q: 如何完全重新开始？

```bash
# 停止所有容器
docker compose down

# 删除所有镜像、容器、缓存
docker system prune -af
docker volume prune -f

# 重新构建
docker compose build --no-cache
docker compose up -d
```

---

## 修复清单

在部署前，确认以下修复都已应用：

- [x] ✅ `docker-compose.yml` - args 使用冒号格式
- [x] ✅ `docker-compose.yml` - 删除 version 字段
- [x] ✅ `packages/server/Dockerfile` - 删除 tsconfig.json 复制
- [x] ✅ `packages/client/Dockerfile` - 删除 tsconfig.json 复制
- [x] ✅ `deploy.sh` - 支持 Docker Compose V2
- [x] ✅ `.env` - 配置 JWT_SECRET

---

## 预期结果

构建成功后，你应该看到：

```
[+] Building 180.5s (45/45) FINISHED
 => [server] ...
 => [client] ...
Successfully built xxxxx
Successfully tagged web_game_set-server:latest
Successfully tagged web_game_set-client:latest

[INFO] 镜像构建成功
```

然后服务会自动启动，稍等片刻就可以访问游戏了。

---

## 部署时间估算

- 首次构建：10-15 分钟
- 使用缓存：2-5 分钟
- 完全重新构建（--no-cache）：15-20 分钟

---

**现在可以重新部署了！** 🚀

所有问题都已修复，按照上述步骤操作即可成功部署。
