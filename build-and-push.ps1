# Docker Build and Push Script for PowerShell
# Usage: .\build-and-push.ps1 -DockerUsername "your-username"

param(
    [Parameter(Mandatory=$false)]
    [string]$DockerUsername = $env:DOCKER_USERNAME,

    [Parameter(Mandatory=$false)]
    [string]$Version = "latest"
)

# Check if Docker username is provided
if ([string]::IsNullOrEmpty($DockerUsername)) {
    Write-Host "[ERROR] Please provide Docker Hub username" -ForegroundColor Red
    Write-Host "Usage: .\build-and-push.ps1 -DockerUsername your-username" -ForegroundColor Yellow
    Write-Host "Or set environment variable: `$env:DOCKER_USERNAME = 'your-username'" -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Docker Hub Username: $DockerUsername" -ForegroundColor Green
Write-Host "[INFO] Image Version: $Version" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
Write-Host "[INFO] Checking Docker..." -ForegroundColor Green
try {
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
} catch {
    Write-Host "[ERROR] Docker is not running, please start Docker Desktop" -ForegroundColor Red
    exit 1
}

# Login to Docker Hub
Write-Host "[INFO] Logging in to Docker Hub..." -ForegroundColor Green
docker login
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Hub login failed" -ForegroundColor Red
    exit 1
}

# Build server image
Write-Host "[INFO] Building server image..." -ForegroundColor Green
docker build -f packages/server/Dockerfile -t "${DockerUsername}/avalon-server:${Version}" -t "${DockerUsername}/avalon-server:latest" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Server image build failed" -ForegroundColor Red
    exit 1
}

# Build client image
Write-Host "[INFO] Building client image..." -ForegroundColor Green
docker build -f packages/client/Dockerfile -t "${DockerUsername}/avalon-client:${Version}" -t "${DockerUsername}/avalon-client:latest" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Client image build failed" -ForegroundColor Red
    exit 1
}

# Push images to Docker Hub
Write-Host "[INFO] Pushing server image..." -ForegroundColor Green
docker push "${DockerUsername}/avalon-server:${Version}"
docker push "${DockerUsername}/avalon-server:latest"

Write-Host "[INFO] Pushing client image..." -ForegroundColor Green
docker push "${DockerUsername}/avalon-client:${Version}"
docker push "${DockerUsername}/avalon-client:latest"

Write-Host ""
Write-Host "[SUCCESS] All images pushed to Docker Hub successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update docker-compose.prod.yml, replace 'your-dockerhub-username' with: $DockerUsername" -ForegroundColor Yellow
Write-Host "2. On server run: docker-compose -f docker-compose.prod.yml pull" -ForegroundColor Yellow
Write-Host "3. On server run: docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Yellow
Write-Host ""
