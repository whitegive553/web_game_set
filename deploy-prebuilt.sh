#!/bin/bash

###############################################################################
# 阿瓦隆游戏部署脚本（使用预构建镜像）
# 适用于阿里云轻量应用服务器（Docker CE 版本）
# 使用从 Docker Hub 拉取的预构建镜像
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
    print_info "使用命令: sudo ./deploy-prebuilt.sh"
    exit 1
fi

print_step "开始部署阿瓦隆游戏（使用预构建镜像）"

# 1. 检查 Docker 和 Docker Compose
print_step "1/6 检查 Docker 环境"

if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装，请使用预装 Docker CE 的服务器"
    exit 1
fi

# 检测 Docker Compose 版本（V2 优先）
DOCKER_COMPOSE_CMD=""

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    print_info "检测到 Docker Compose V2"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    print_info "检测到 Docker Compose V1"
else
    print_error "Docker Compose 未安装，请先安装"
    exit 1
fi

print_info "Docker 版本: $(docker --version)"
if [ "$DOCKER_COMPOSE_CMD" = "docker compose" ]; then
    print_info "Docker Compose 版本: $(docker compose version)"
else
    print_info "Docker Compose 版本: $(docker-compose --version)"
fi

# 2. 检查 .env 文件
print_step "2/6 检查环境变量配置"

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
    read -p "是否继续部署？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_info "环境变量配置检查完成"

# 3. 检查 docker-compose.prod.yml
print_step "3/6 检查配置文件"

if [ ! -f docker-compose.prod.yml ]; then
    print_error "docker-compose.prod.yml 文件不存在！"
    exit 1
fi

# 检查是否还在使用占位符
if grep -q "your-dockerhub-username" docker-compose.prod.yml; then
    print_error "检测到 docker-compose.prod.yml 中仍使用 'your-dockerhub-username'"
    print_warn "请编辑 docker-compose.prod.yml，将 'your-dockerhub-username' 替换为你的 Docker Hub 用户名"
    exit 1
fi

# 4. 停止旧服务
print_step "4/6 停止旧服务（如果存在）"

if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps 2>/dev/null | grep -q "Up"; then
    print_info "检测到运行中的服务，正在停止..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down
    print_info "旧服务已停止"
else
    print_info "没有运行中的服务"
fi

# 5. 拉取最新镜像
print_step "5/6 拉取最新镜像"

print_info "从 Docker Hub 拉取镜像..."
if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml pull; then
    print_info "镜像拉取成功"
else
    print_error "镜像拉取失败，请检查网络和 Docker Hub 配置"
    exit 1
fi

# 6. 启动服务
print_step "6/6 启动服务"

if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d; then
    print_info "服务启动成功"
else
    print_error "服务启动失败"
    exit 1
fi

# 等待服务就绪
print_info "等待服务就绪..."
sleep 10

# 检查容器状态
print_info "容器状态："
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps

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
echo -e "  查看日志:   ${YELLOW}${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml logs -f${NC}"
echo -e "  查看状态:   ${YELLOW}${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml ps${NC}"
echo -e "  停止服务:   ${YELLOW}${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml down${NC}"
echo -e "  重启服务:   ${YELLOW}${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml restart${NC}"
echo -e "  更新镜像:   ${YELLOW}${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml pull && ${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml up -d${NC}"
echo ""

print_info "提示: 建议配置域名和 HTTPS 证书以提高安全性"

exit 0
