#!/bin/bash

###############################################################################
# 阿瓦隆游戏自动部署脚本
# 适用于阿里云轻量应用服务器（Docker CE 版本）
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${GREEN}===================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}===================================${NC}\n"
}

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
    print_error "请使用 root 用户运行此脚本"
    print_info "使用命令: sudo ./deploy.sh"
    exit 1
fi

print_step "开始部署阿瓦隆游戏"

# 1. 检查 Docker 和 Docker Compose
print_step "1/7 检查 Docker 环境"

if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装，请使用预装 Docker CE 的服务器"
    exit 1
fi

# 检测 Docker Compose 版本（V2 优先）
DOCKER_COMPOSE_CMD=""

# 先检查 docker compose (V2, 推荐)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    print_info "检测到 Docker Compose V2"
# 再检查 docker-compose (V1, 旧版)
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    print_info "检测到 Docker Compose V1"
else
    print_warn "Docker Compose 未安装，正在安装最新版本..."

    # 检测包管理器
    if command -v yum &> /dev/null; then
        # RHEL/CentOS/Alibaba Cloud Linux
        print_info "检测到 yum 包管理器（RHEL/CentOS/Alibaba Cloud Linux）"

        # 从 GitHub 下载最新版本（推荐）
        print_info "从 GitHub 下载最新版 Docker Compose..."

        # 下载最新版本的 docker-compose
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "v\K[^"]*')
        if [ -z "$COMPOSE_VERSION" ]; then
            COMPOSE_VERSION="2.24.0"  # 备用版本
        fi

        print_info "下载 Docker Compose v${COMPOSE_VERSION}..."
        curl -L "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose

        # 创建软链接
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

        DOCKER_COMPOSE_CMD="docker-compose"
        print_info "docker-compose v${COMPOSE_VERSION} 安装成功"
    elif command -v apt &> /dev/null; then
        # Debian/Ubuntu
        print_info "检测到 apt 包管理器（Debian/Ubuntu）"
        apt update
        apt install -y docker-compose
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "未检测到支持的包管理器（yum 或 apt）"
        exit 1
    fi
fi

print_info "Docker 版本: $(docker --version)"
if [ "$DOCKER_COMPOSE_CMD" = "docker compose" ]; then
    print_info "Docker Compose 版本: $(docker compose version)"
else
    print_info "Docker Compose 版本: $(docker-compose --version)"
fi
print_info "使用命令: ${DOCKER_COMPOSE_CMD}"

# 2. 检查 .env 文件
print_step "2/7 检查环境变量配置"

if [ ! -f .env ]; then
    print_warn ".env 文件不存在，从示例创建..."

    if [ -f .env.production ]; then
        cp .env.production .env
        print_info "已从 .env.production 创建 .env"
    else
        print_error ".env.production 文件不存在！"
        exit 1
    fi
fi

# 检查 JWT_SECRET 是否已修改
if grep -q "your-super-secret-jwt-key-change-this" .env; then
    print_error "检测到 JWT_SECRET 使用默认值！"
    print_warn "请编辑 .env 文件，修改 JWT_SECRET 为安全的随机字符串"
    print_info "可以使用以下命令生成随机密钥："
    print_info "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    read -p "是否继续部署？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_info "环境变量配置检查完成"

# 3. 创建数据目录
print_step "3/8 创建数据目录"

if [ ! -d "./data" ]; then
    mkdir -p ./data/avalon
    chmod -R 777 ./data
    print_info "数据目录已创建: ./data"
else
    print_info "数据目录已存在: ./data"
fi

# 4. 停止旧服务
print_step "4/8 停止旧服务（如果存在）"

if $DOCKER_COMPOSE_CMD ps 2>/dev/null | grep -q "Up"; then
    print_info "检测到运行中的服务，正在停止..."
    $DOCKER_COMPOSE_CMD down
    print_info "旧服务已停止"
else
    print_info "没有运行中的服务"
fi

# 5. 构建镜像
print_step "5/8 构建 Docker 镜像"

print_warn "首次构建可能需要 10-15 分钟，请耐心等待..."

# 添加 --no-cache 参数强制重新构建，避免使用旧的缓存层
if $DOCKER_COMPOSE_CMD build --no-cache; then
    print_info "镜像构建成功"
else
    print_error "镜像构建失败，请检查日志"
    exit 1
fi

# 6. 启动服务
print_step "6/8 启动服务"

if $DOCKER_COMPOSE_CMD up -d; then
    print_info "服务启动成功"
else
    print_error "服务启动失败"
    exit 1
fi

# 7. 等待服务就绪
print_step "7/8 等待服务就绪"

print_info "等待后端服务启动..."
sleep 10

# 检查服务健康状态
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        print_info "后端服务已就绪 ✓"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "后端服务启动超时"
        print_info "查看日志: $DOCKER_COMPOSE_CMD logs server"
        exit 1
    fi
done

echo ""

print_info "等待前端服务启动..."
sleep 5

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        print_info "前端服务已就绪 ✓"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "前端服务启动超时"
        print_info "查看日志: $DOCKER_COMPOSE_CMD logs client"
        exit 1
    fi
done

echo ""

# 8. 验证部署
print_step "8/8 验证部署"

# 检查容器状态
print_info "容器状态："
$DOCKER_COMPOSE_CMD ps

# 获取服务器公网 IP
SERVER_IP=$(curl -s ifconfig.me)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="your-server-ip"
fi

print_step "部署成功！🎉"

echo -e "${GREEN}访问信息：${NC}"
echo -e "  游戏地址: ${YELLOW}http://${SERVER_IP}${NC}"
echo -e "  后端 API: ${YELLOW}http://${SERVER_IP}:3001${NC}"
echo ""

echo -e "${GREEN}常用命令：${NC}"
echo -e "  查看日志:   ${YELLOW}${DOCKER_COMPOSE_CMD} logs -f${NC}"
echo -e "  查看状态:   ${YELLOW}${DOCKER_COMPOSE_CMD} ps${NC}"
echo -e "  停止服务:   ${YELLOW}${DOCKER_COMPOSE_CMD} down${NC}"
echo -e "  重启服务:   ${YELLOW}${DOCKER_COMPOSE_CMD} restart${NC}"
echo -e "  查看资源:   ${YELLOW}docker stats${NC}"
echo ""

echo -e "${GREEN}下一步：${NC}"
echo -e "  1. 在浏览器访问 ${YELLOW}http://${SERVER_IP}${NC}"
echo -e "  2. 注册账号并开始游戏"
echo -e "  3. 查看完整文档: ${YELLOW}cat DEPLOYMENT.md${NC}"
echo ""

print_info "提示: 建议配置域名和 HTTPS 证书以提高安全性"
print_info "详见 DEPLOYMENT.md 第十二章节"

exit 0
