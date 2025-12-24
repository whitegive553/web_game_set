# Docker 预构建镜像部署指南

本指南介绍如何在本地构建 Docker 镜像，推送到 Docker Hub，然后在服务器上使用预构建的镜像部署。

## 优势

✅ **避免服务器构建失败** - 在本地验证构建成功后再部署
✅ **节省服务器资源** - 服务器只需下载镜像，无需编译
✅ **部署速度快** - 拉取镜像比构建快得多
✅ **版本一致性** - 确保开发和生产环境完全一致
✅ **易于回滚** - 可以快速切换到之前的镜像版本

---

## 前置准备

### 1. 注册 Docker Hub 账号

访问 https://hub.docker.com 注册免费账号（公开仓库免费）

### 2. 本地安装 Docker Desktop

- **Windows**: 下载 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- **Mac**: 下载 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)

---

## 部署步骤

### 第一步：本地构建并推送镜像

#### Windows 用户：

```cmd
# 1. 设置你的 Docker Hub 用户名
set DOCKER_USERNAME=your-dockerhub-username

# 2. 运行构建脚本
build-and-push.bat
```

#### Mac/Linux 用户：

```bash
# 1. 设置你的 Docker Hub 用户名
export DOCKER_USERNAME=your-dockerhub-username

# 2. 给脚本添加执行权限
chmod +x build-and-push.sh

# 3. 运行构建脚本
./build-and-push.sh
```

**脚本会自动完成：**
- ✓ 检查 Docker 环境
- ✓ 登录 Docker Hub（需要输入密码）
- ✓ 构建后端和前端镜像
- ✓ 推送镜像到 Docker Hub

### 第二步：修改生产环境配置文件

编辑 `docker-compose.prod.yml`，将所有 `your-dockerhub-username` 替换为你的 Docker Hub 用户名：

```yaml
services:
  server:
    image: your-dockerhub-username/avalon-server:latest  # ← 修改这里

  client:
    image: your-dockerhub-username/avalon-client:latest  # ← 修改这里
```

**示例：** 如果你的 Docker Hub 用户名是 `john123`，则改为：

```yaml
services:
  server:
    image: john123/avalon-server:latest

  client:
    image: john123/avalon-client:latest
```

### 第三步：上传文件到服务器

只需上传这些文件到服务器（**不需要**上传整个项目）：

```bash
# 使用 scp 或 FTP 上传以下文件：
docker-compose.prod.yml
deploy-prebuilt.sh
.env.production (或直接创建 .env)
```

**上传示例：**

```bash
# 从本地上传到服务器
scp docker-compose.prod.yml root@your-server-ip:/root/avalon/
scp deploy-prebuilt.sh root@your-server-ip:/root/avalon/
scp .env.production root@your-server-ip:/root/avalon/
```

或者使用 Git：

```bash
# 在服务器上
git clone your-repo-url
cd your-repo
```

### 第四步：在服务器上部署

SSH 登录服务器后：

```bash
# 1. 进入项目目录
cd /path/to/avalon

# 2. 给脚本添加执行权限
chmod +x deploy-prebuilt.sh

# 3. 运行部署脚本
sudo ./deploy-prebuilt.sh
```

**部署脚本会自动：**
- ✓ 检查 Docker 环境
- ✓ 验证配置文件
- ✓ 从 Docker Hub 拉取镜像
- ✓ 启动服务
- ✓ 健康检查

---

## 版本管理

### 构建特定版本

```bash
# Windows
set VERSION=v1.0.0
build-and-push.bat

# Mac/Linux
export VERSION=v1.0.0
./build-and-push.sh
```

### 部署特定版本

修改 `docker-compose.prod.yml`：

```yaml
services:
  server:
    image: your-dockerhub-username/avalon-server:v1.0.0  # 指定版本号
```

然后运行：

```bash
sudo ./deploy-prebuilt.sh
```

---

## 更新部署

### 快速更新流程

**本地：**

```bash
# 1. 修改代码后，重新构建并推送
export DOCKER_USERNAME=your-dockerhub-username
./build-and-push.sh
```

**服务器：**

```bash
# 2. 拉取最新镜像并重启
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 常用命令

### 本地命令

```bash
# 查看本地镜像
docker images | grep avalon

# 删除本地镜像
docker rmi your-dockerhub-username/avalon-server:latest
docker rmi your-dockerhub-username/avalon-client:latest

# 测试本地运行
docker-compose up -d
```

### 服务器命令

```bash
# 查看运行状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f server
docker-compose -f docker-compose.prod.yml logs -f client

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 更新并重启
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 方案对比

### 方案一：服务器构建（原方案）

```bash
# 需要上传整个项目
# 服务器执行
sudo ./deploy.sh  # 在服务器上构建，需要 5-15 分钟
```

**优点：** 简单直接
**缺点：**
- 构建慢（首次 10-15 分钟）
- 可能因服务器环境问题构建失败
- 消耗服务器资源

### 方案二：预构建镜像（新方案）✨

```bash
# 本地构建并推送
./build-and-push.sh  # 在本地构建，推送到 Docker Hub

# 服务器只需拉取镜像
sudo ./deploy-prebuilt.sh  # 只需下载镜像，1-3 分钟
```

**优点：**
- ✅ 部署快速（1-3 分钟）
- ✅ 构建问题在本地解决
- ✅ 节省服务器资源
- ✅ 易于版本管理和回滚

**缺点：**
- 需要 Docker Hub 账号
- 需要本地安装 Docker

---

## 私有镜像（可选）

如果不想公开镜像，可以使用：

### 1. Docker Hub 私有仓库（付费）

https://hub.docker.com/pricing

### 2. 阿里云容器镜像服务（免费额度）

https://cr.console.aliyun.com/

### 3. 自建 Docker Registry

```bash
# 在服务器上运行 Registry
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# 构建时推送到自建 registry
docker tag avalon-server:latest your-server-ip:5000/avalon-server:latest
docker push your-server-ip:5000/avalon-server:latest
```

---

## 故障排查

### 镜像推送失败

```bash
# 重新登录 Docker Hub
docker login

# 检查镜像标签是否正确
docker images | grep avalon
```

### 服务器拉取镜像失败

```bash
# 检查网络
ping hub.docker.com

# 使用镜像加速（国内服务器）
# 编辑 /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://registry.docker-cn.com"
  ]
}

# 重启 Docker
sudo systemctl restart docker
```

### 查看构建日志

```bash
# 本地查看构建详情
docker build -f packages/server/Dockerfile --progress=plain .
```

---

## 总结

推荐使用**预构建镜像方案**，特别适合：

- ✅ 服务器资源有限
- ✅ 需要频繁部署更新
- ✅ 多个环境（测试、生产）部署
- ✅ 团队协作开发

祝部署顺利！🎉
