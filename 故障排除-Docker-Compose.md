# Docker Compose 版本问题故障排除

## 问题症状

```
compose build requires buildx 0.17 or later
```

---

## 已修复的问题

✅ **已完成的修复**：

1. ✅ `docker-compose.yml` - 修复 `args` 格式（改为 YAML 映射格式）
2. ✅ `docker-compose.yml` - 删除过时的 `version` 字段
3. ✅ `deploy.sh` - 自动检测并使用正确的 Docker Compose 版本

---

## 立即解决方案

### 方案 1：重新上传修复后的文件（最快）

```bash
# 在服务器上执行

# 1. 拉取最新代码
cd /opt/web_game_set/web_game_set
git pull

# 2. 验证修复
cat docker-compose.yml | head -n 5
# 应该看到第一行是 services: 而不是 version: '3.8'

# 3. 重新运行部署脚本
./deploy.sh
```

### 方案 2：手动使用 Docker Compose V2（推荐）

```bash
cd /opt/web_game_set/web_game_set

# 1. 检查 V2 是否可用
docker compose version

# 2. 如果有输出，直接使用 V2
docker compose down 2>/dev/null
docker compose build
docker compose up -d

# 3. 查看日志
docker compose logs -f
```

### 方案 3：升级 Docker Compose

```bash
# 1. 删除旧版本
yum remove -y docker-compose

# 2. 下载最新版本
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "v\K[^"]*')
curl -L "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 3. 设置权限
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# 4. 验证
docker-compose --version

# 5. 重新部署
cd /opt/web_game_set/web_game_set
./deploy.sh
```

---

## 详细说明

### 修复内容 1：args 格式错误

**错误代码**（旧）：
```yaml
args:
  VITE_API_URL=http://localhost:3001
```

**正确代码**（新）：
```yaml
args:
  VITE_API_URL: http://localhost:3001
```

### 修复内容 2：删除 version 字段

**旧代码**：
```yaml
version: '3.8'

services:
  ...
```

**新代码**：
```yaml
services:
  ...
```

### 修复内容 3：自动检测 Docker Compose 版本

脚本现在会：
1. 优先使用 `docker compose`（V2）
2. 如果 V2 不可用，使用 `docker-compose`（V1）
3. 如果都不可用，自动下载最新版本

---

## 验证修复

### 1. 检查 docker-compose.yml

```bash
cat docker-compose.yml | head -n 10
```

**应该看到**：
- 第一行是 `services:` 而不是 `version: '3.8'`
- `args` 部分使用冒号 `:` 而不是等号 `=`

### 2. 检查 Docker Compose 版本

```bash
# 检查 V2
docker compose version

# 或检查 V1
docker-compose --version
```

### 3. 验证配置文件语法

```bash
cd /opt/web_game_set/web_game_set

# 使用 V2
docker compose config

# 或使用 V1
docker-compose config
```

如果没有错误，会输出解析后的配置。

---

## 常见问题

### Q1: 如何判断使用的是哪个版本？

```bash
# V2 (推荐)
docker compose version
# 输出: Docker Compose version v2.x.x

# V1 (旧版)
docker-compose --version
# 输出: docker-compose version 1.x.x
```

### Q2: 可以同时安装两个版本吗？

可以。V2 是内置在 Docker 中的，V1 是独立的二进制文件。建议优先使用 V2。

### Q3: 如何强制使用 V2？

```bash
# 方法 1：直接使用 docker compose 命令
docker compose up -d

# 方法 2：创建别名
alias docker-compose='docker compose'
```

---

## 完整部署流程（修复后）

```bash
# 1. 进入项目目录
cd /opt/web_game_set/web_game_set

# 2. 拉取最新代码（包含修复）
git pull

# 3. 配置环境变量（如果还没有）
if [ ! -f .env ]; then
    cp .env.production .env
    # 修改 JWT_SECRET
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s/your-super-secret-jwt-key-change-this-to-random-string/$JWT_SECRET/g" .env
fi

# 4. 配置防火墙（如果还没有）
systemctl start firewalld
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload

# 5. 运行部署脚本（自动使用正确版本）
chmod +x deploy.sh
./deploy.sh

# 6. 查看日志
docker compose logs -f
# 或
docker-compose logs -f
```

---

## 日志查看命令

```bash
# 实时查看所有日志
docker compose logs -f

# 只看后端
docker compose logs -f server

# 只看前端
docker compose logs -f client

# 查看最近 100 行
docker compose logs --tail=100

# 带时间戳
docker compose logs -f --timestamps
```

---

## 紧急回退

如果部署失败，可以回退：

```bash
# 停止所有服务
docker compose down

# 清理资源
docker system prune -a

# 重新开始
./deploy.sh
```

---

## 联系支持

如果问题仍然存在，请提供以下信息：

```bash
# 1. Docker 版本
docker --version

# 2. Docker Compose 版本
docker compose version
docker-compose --version

# 3. 系统信息
cat /etc/os-release

# 4. 完整错误日志
docker compose build 2>&1 | tee build-error.log
```

---

**修复已完成！重新运行 `./deploy.sh` 即可部署。** 🚀
