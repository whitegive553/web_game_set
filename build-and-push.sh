#!/bin/bash

###############################################################################
# Docker 镜像构建和推送脚本
# 在本地构建镜像并推送到 Docker Hub
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否设置了 Docker Hub 用户名
if [ -z "$DOCKER_USERNAME" ]; then
    print_error "请设置 DOCKER_USERNAME 环境变量"
    print_info "例如: export DOCKER_USERNAME=your-dockerhub-username"
    exit 1
fi

# 设置镜像版本（默认为 latest，可以通过环境变量覆盖）
VERSION=${VERSION:-latest}

print_info "Docker Hub 用户名: $DOCKER_USERNAME"
print_info "镜像版本: $VERSION"

# 1. 检查 Docker 是否运行
print_info "检查 Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker 未运行，请启动 Docker Desktop"
    exit 1
fi

# 2. 登录 Docker Hub
print_info "登录 Docker Hub..."
docker login

# 3. 构建后端镜像
print_info "构建后端镜像..."
docker build -f packages/server/Dockerfile \
    -t $DOCKER_USERNAME/avalon-server:$VERSION \
    -t $DOCKER_USERNAME/avalon-server:latest \
    .

# 4. 构建前端镜像
print_info "构建前端镜像..."
docker build -f packages/client/Dockerfile \
    -t $DOCKER_USERNAME/avalon-client:$VERSION \
    -t $DOCKER_USERNAME/avalon-client:latest \
    .

# 5. 推送镜像到 Docker Hub
print_info "推送后端镜像..."
docker push $DOCKER_USERNAME/avalon-server:$VERSION
docker push $DOCKER_USERNAME/avalon-server:latest

print_info "推送前端镜像..."
docker push $DOCKER_USERNAME/avalon-client:$VERSION
docker push $DOCKER_USERNAME/avalon-client:latest

print_info "✓ 所有镜像已成功推送到 Docker Hub"
echo ""
echo -e "${GREEN}下一步：${NC}"
echo -e "1. 在服务器上更新 docker-compose.prod.yml，将 'your-dockerhub-username' 替换为: ${YELLOW}$DOCKER_USERNAME${NC}"
echo -e "2. 在服务器上运行: ${YELLOW}docker-compose -f docker-compose.prod.yml pull${NC}"
echo -e "3. 在服务器上运行: ${YELLOW}docker-compose -f docker-compose.prod.yml up -d${NC}"
echo ""
