# 阿瓦隆游戏 Windows 本地测试部署脚本
# PowerShell 脚本

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-ColorOutput "===================================" "Green"
    Write-ColorOutput $Message "Green"
    Write-ColorOutput "===================================" "Green"
    Write-Host ""
}

Write-Step "开始部署阿瓦隆游戏（Windows 本地测试）"

# 1. 检查 Docker Desktop
Write-Step "1/6 检查 Docker 环境"

try {
    $dockerVersion = docker --version
    Write-ColorOutput "[✓] Docker: $dockerVersion" "Green"
} catch {
    Write-ColorOutput "[✗] Docker 未安装或未启动" "Red"
    Write-ColorOutput "    请先安装并启动 Docker Desktop" "Yellow"
    Write-ColorOutput "    下载地址: https://www.docker.com/products/docker-desktop" "Yellow"
    exit 1
}

try {
    $composeVersion = docker-compose --version
    Write-ColorOutput "[✓] Docker Compose: $composeVersion" "Green"
} catch {
    Write-ColorOutput "[✗] Docker Compose 不可用" "Red"
    exit 1
}

# 2. 检查 .env 文件
Write-Step "2/6 检查环境变量配置"

if (-not (Test-Path .env)) {
    Write-ColorOutput "[!] .env 文件不存在，从示例创建..." "Yellow"

    if (Test-Path .env.production) {
        Copy-Item .env.production .env
        Write-ColorOutput "[✓] 已从 .env.production 创建 .env" "Green"
    } else {
        Write-ColorOutput "[✗] .env.production 文件不存在！" "Red"
        exit 1
    }
}

# 检查 JWT_SECRET
$envContent = Get-Content .env -Raw
if ($envContent -match "your-super-secret-jwt-key-change-this") {
    Write-ColorOutput "[!] 检测到 JWT_SECRET 使用默认值" "Yellow"
    Write-ColorOutput "    本地测试可以继续，生产环境请务必修改！" "Yellow"
}

Write-ColorOutput "[✓] 环境变量配置检查完成" "Green"

# 3. 停止旧服务
Write-Step "3/6 停止旧服务（如果存在）"

try {
    $runningContainers = docker-compose ps -q
    if ($runningContainers) {
        Write-ColorOutput "[i] 检测到运行中的服务，正在停止..." "Cyan"
        docker-compose down
        Write-ColorOutput "[✓] 旧服务已停止" "Green"
    } else {
        Write-ColorOutput "[i] 没有运行中的服务" "Cyan"
    }
} catch {
    Write-ColorOutput "[i] 继续部署..." "Cyan"
}

# 4. 构建镜像
Write-Step "4/6 构建 Docker 镜像"

Write-ColorOutput "[!] 首次构建可能需要 10-15 分钟，请耐心等待..." "Yellow"

try {
    docker-compose build
    Write-ColorOutput "[✓] 镜像构建成功" "Green"
} catch {
    Write-ColorOutput "[✗] 镜像构建失败，请检查日志" "Red"
    exit 1
}

# 5. 启动服务
Write-Step "5/6 启动服务"

try {
    docker-compose up -d
    Write-ColorOutput "[✓] 服务启动成功" "Green"
} catch {
    Write-ColorOutput "[✗] 服务启动失败" "Red"
    exit 1
}

# 6. 等待服务就绪
Write-Step "6/6 等待服务就绪"

Write-ColorOutput "[i] 等待后端服务启动..." "Cyan"
Start-Sleep -Seconds 10

$maxRetries = 30
$retryCount = 0
$backendReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput "[✓] 后端服务已就绪" "Green"
            $backendReady = $true
            break
        }
    } catch {
        $retryCount++
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
}

Write-Host ""

if (-not $backendReady) {
    Write-ColorOutput "[✗] 后端服务启动超时" "Red"
    Write-ColorOutput "    查看日志: docker-compose logs server" "Yellow"
    exit 1
}

Write-ColorOutput "[i] 等待前端服务启动..." "Cyan"
Start-Sleep -Seconds 5

$retryCount = 0
$frontendReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput "[✓] 前端服务已就绪" "Green"
            $frontendReady = $true
            break
        }
    } catch {
        $retryCount++
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
}

Write-Host ""

if (-not $frontendReady) {
    Write-ColorOutput "[✗] 前端服务启动超时" "Red"
    Write-ColorOutput "    查看日志: docker-compose logs client" "Yellow"
    exit 1
}

# 验证部署
Write-Step "部署成功！🎉"

Write-Host ""
Write-ColorOutput "容器状态：" "Green"
docker-compose ps

Write-Host ""
Write-ColorOutput "访问信息：" "Green"
Write-ColorOutput "  游戏地址: http://localhost" "Cyan"
Write-ColorOutput "  后端 API: http://localhost:3001" "Cyan"

Write-Host ""
Write-ColorOutput "常用命令：" "Green"
Write-ColorOutput "  查看日志:   docker-compose logs -f" "Yellow"
Write-ColorOutput "  查看状态:   docker-compose ps" "Yellow"
Write-ColorOutput "  停止服务:   docker-compose down" "Yellow"
Write-ColorOutput "  重启服务:   docker-compose restart" "Yellow"
Write-ColorOutput "  查看资源:   docker stats" "Yellow"

Write-Host ""
Write-ColorOutput "下一步：" "Green"
Write-ColorOutput "  1. 在浏览器访问 http://localhost" "Cyan"
Write-ColorOutput "  2. 注册账号并开始游戏" "Cyan"
Write-ColorOutput "  3. 查看完整文档: Get-Content DEPLOYMENT.md" "Cyan"

Write-Host ""
Write-ColorOutput "[i] 本地测试完成后，请参考 DEPLOYMENT.md 部署到阿里云服务器" "Yellow"

exit 0
