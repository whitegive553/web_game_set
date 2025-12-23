# 阿瓦隆游戏部署指南

本文档详细说明如何将阿瓦隆游戏部署到阿里云轻量应用服务器。

## 一、服务器选择和配置

### 推荐配置
- **服务器类型**：轻量应用服务器 2vCPU 4GiB（预装 Docker CE）
- **操作系统**：推荐 Ubuntu 20.04 或 22.04 LTS
- **地域**：选择离目标用户最近的区域（如华东、华北）

### 为什么选择 Docker 版本？
1. ✅ 容器化部署，环境一致性好
2. ✅ 一键启动/停止所有服务
3. ✅ 易于维护、回滚和扩展
4. ✅ 隔离性好，不影响系统其他部分

---

## 二、前期准备

### 1. 本地准备工作

在本地项目根目录下，执行以下操作：

```bash
# 1. 复制生产环境配置
cp .env.production .env

# 2. 修改 .env 文件，设置强密码
# 编辑 JWT_SECRET 为一个随机字符串（至少 32 位）
# 例如：JWT_SECRET=a8f3d9e2b7c6f1a4d8e9f2b3c6a7d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6

# 3. 生成随机密钥（可选）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 服务器购买清单

购买服务器后，记录以下信息：
- 服务器公网 IP：`___________________`
- SSH 登录密码：`___________________`
- 或 SSH 密钥路径：`___________________`

---

## 三、服务器初始设置

### 1. SSH 连接到服务器

```bash
# Windows 用户可使用 PowerShell 或 Git Bash
ssh root@你的服务器IP

# 或使用密钥文件
ssh -i /path/to/your-key.pem root@你的服务器IP
```

### 2. 更新系统并安装必要工具

**Alibaba Cloud Linux / CentOS / RHEL (yum):**
```bash
# 更新系统包
sudo yum update -y

# 安装 Git（如果没有）
sudo yum install -y git

# 验证 Docker 安装
docker --version
docker-compose --version

# 如果没有 docker-compose，deploy.sh 会自动安装
# 手动安装命令：sudo yum install -y docker-compose
```

**Ubuntu / Debian (apt):**
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装 Git（如果没有）
sudo apt install -y git

# 验证 Docker 安装
docker --version
docker-compose --version

# 如果没有 docker-compose，安装它
sudo apt install -y docker-compose
```

### 3. 配置防火墙

**Alibaba Cloud Linux / CentOS / RHEL (firewalld):**
```bash
# 启动防火墙服务
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 开放必要端口
sudo firewall-cmd --permanent --add-port=22/tcp    # SSH
sudo firewall-cmd --permanent --add-port=80/tcp    # HTTP
sudo firewall-cmd --permanent --add-port=443/tcp   # HTTPS（可选）

# 重新加载防火墙规则
sudo firewall-cmd --reload

# 查看开放的端口
sudo firewall-cmd --list-ports
```

**Ubuntu / Debian (ufw):**
```bash
# 开放必要端口
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS（可选，未来配置 SSL）
sudo ufw enable
sudo ufw status
```

---

## 四、代码部署

### 方式一：使用 Git（推荐）

```bash
# 1. 在服务器上创建项目目录
cd /root
mkdir -p apps
cd apps

# 2. 克隆代码仓库
# 如果你的代码在 GitHub/GitLab
git clone https://github.com/你的用户名/web_llm.git avalon-game
cd avalon-game

# 如果是私有仓库，需要配置 SSH key 或使用 HTTPS + token
```

### 方式二：手动上传（备选）

如果没有 Git 仓库：

```bash
# 在本地打包项目（排除 node_modules）
# Windows PowerShell:
Compress-Archive -Path C:\aipengze\web_llm\* -DestinationPath avalon-game.zip

# 使用 SCP 上传到服务器
scp avalon-game.zip root@你的服务器IP:/root/apps/

# 在服务器上解压
cd /root/apps
unzip avalon-game.zip -d avalon-game
cd avalon-game
```

---

## 五、配置环境变量

### 1. 创建生产环境配置

```bash
cd /root/apps/avalon-game

# 创建 .env 文件
cat > .env << 'EOF'
JWT_SECRET=你的超级安全密钥-至少32位-随机字符串
PORT=3001
SESSION_TIMEOUT=1800000
EOF

# 确保权限正确
chmod 600 .env
```

### 2. 验证配置

```bash
cat .env
# 确保 JWT_SECRET 已修改为安全的随机字符串
```

---

## 六、构建和启动服务

### 1. 构建 Docker 镜像

```bash
cd /root/apps/avalon-game

# 构建镜像（首次运行会较慢，10-15分钟）
docker-compose build

# 查看构建的镜像
docker images
```

### 2. 启动服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 只查看后端日志
docker-compose logs -f server

# 只查看前端日志
docker-compose logs -f client
```

### 3. 验证服务运行

```bash
# 检查容器状态
docker ps

# 测试后端 API
curl http://localhost:3001/health

# 测试前端
curl http://localhost/health
```

---

## 七、访问应用

### 1. 通过 IP 访问

在浏览器中访问：
```
http://你的服务器IP
```

### 2. 测试游戏功能

1. 注册账号
2. 登录
3. 创建游戏房间
4. 邀请其他玩家加入
5. 开始游戏

---

## 八、常用管理命令

### 服务管理

```bash
# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 只重启后端
docker-compose restart server

# 只重启前端
docker-compose restart client

# 查看服务状态
docker-compose ps

# 查看资源使用
docker stats
```

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100

# 查看特定服务日志
docker-compose logs server
docker-compose logs client
```

### 更新代码

```bash
# 1. 拉取最新代码
cd /root/apps/avalon-game
git pull

# 2. 重新构建并启动
docker-compose down
docker-compose build
docker-compose up -d

# 3. 查看日志确认启动成功
docker-compose logs -f
```

---

## 九、性能优化建议

### 1. 启用 Gzip 压缩

nginx 配置已包含 gzip 压缩，无需额外配置。

### 2. 配置静态资源缓存

nginx 配置已包含静态资源缓存策略。

### 3. 定期清理 Docker

```bash
# 清理未使用的镜像和容器
docker system prune -a

# 清理构建缓存
docker builder prune
```

---

## 十、监控和维护

### 1. 设置定时任务重启（可选）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 4 点重启）
0 4 * * * cd /root/apps/avalon-game && docker-compose restart
```

### 2. 设置日志轮转

```bash
# 创建 Docker 日志轮转配置
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# 重启 Docker 服务
sudo systemctl restart docker

# 重启应用
cd /root/apps/avalon-game
docker-compose restart
```

### 3. 监控资源使用

```bash
# 实时查看资源使用
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

---

## 十一、故障排查

### 问题 1：无法访问网站

```bash
# 检查防火墙（根据系统选择命令）
sudo firewall-cmd --list-ports  # RHEL/CentOS/Alibaba Cloud Linux
# 或
sudo ufw status                  # Ubuntu/Debian

# 检查端口监听
sudo netstat -tlnp | grep -E '80|3001'
# 或（如果没有 netstat）
sudo ss -tlnp | grep -E '80|3001'

# 检查容器状态
docker-compose ps

# 查看容器日志
docker-compose logs
```

### 问题 2：WebSocket 连接失败

```bash
# 检查 nginx 配置
docker exec avalon-client cat /etc/nginx/conf.d/default.conf

# 检查后端服务
docker-compose logs server | grep -i websocket

# 重启服务
docker-compose restart
```

### 问题 3：内存不足

```bash
# 查看内存使用
free -h
docker stats

# 如果内存不足，考虑添加 Swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 问题 4：构建失败

```bash
# 清理旧的构建缓存
docker-compose down
docker system prune -a
docker builder prune

# 重新构建
docker-compose build --no-cache
```

---

## 十二、安全加固（推荐）

### 1. 修改 SSH 端口

```bash
sudo nano /etc/ssh/sshd_config
# 修改 Port 22 为其他端口，如 2222
sudo systemctl restart sshd

# 记得在防火墙开放新端口
# RHEL/CentOS/Alibaba Cloud Linux:
sudo firewall-cmd --permanent --add-port=2222/tcp
sudo firewall-cmd --reload

# Ubuntu/Debian:
sudo ufw allow 2222
```

### 2. 禁用 root 登录

```bash
# 先创建普通用户
sudo adduser avalon
sudo usermod -aG sudo avalon

# 修改 SSH 配置
sudo nano /etc/ssh/sshd_config
# 设置 PermitRootLogin no

sudo systemctl restart sshd
```

### 3. 配置 HTTPS（可选但推荐）

**Alibaba Cloud Linux / CentOS / RHEL (yum):**
```bash
# 安装 EPEL 仓库（如果没有）
sudo yum install -y epel-release

# 安装 Certbot
sudo yum install -y certbot python3-certbot-nginx

# 申请免费 SSL 证书（需要域名）
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

**Ubuntu / Debian (apt):**
```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请免费 SSL 证书（需要域名）
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 十三、备份策略

### 手动备份

```bash
# 备份环境变量
cp .env .env.backup

# 导出数据（如果有持久化数据）
tar -czf avalon-backup-$(date +%Y%m%d).tar.gz data/

# 下载到本地
scp root@服务器IP:/root/apps/avalon-game/*.tar.gz ./
```

---

## 十四、快速参考命令

```bash
# 🚀 启动服务
docker-compose up -d

# 🛑 停止服务
docker-compose down

# 🔄 重启服务
docker-compose restart

# 📋 查看日志
docker-compose logs -f

# 📊 查看状态
docker-compose ps
docker stats

# 🔧 进入容器调试
docker exec -it avalon-server sh
docker exec -it avalon-client sh

# 🔄 更新代码
git pull && docker-compose down && docker-compose build && docker-compose up -d
```

---

## 十五、联系和支持

如遇到问题：
1. 查看日志：`docker-compose logs -f`
2. 检查容器状态：`docker-compose ps`
3. 查看资源使用：`docker stats`
4. 参考本文档的故障排查章节

---

## 附录：环境变量说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| JWT_SECRET | JWT 加密密钥 | - | ✅ |
| PORT | 后端服务端口 | 3001 | ❌ |
| SESSION_TIMEOUT | 会话超时时间（毫秒） | 1800000 | ❌ |

---

**部署完成！🎉**

祝你的阿瓦隆游戏运行顺利！
