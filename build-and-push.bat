@echo off
setlocal enabledelayedexpansion

REM Check DOCKER_USERNAME environment variable
if "%DOCKER_USERNAME%"=="" (
    echo [ERROR] Please set DOCKER_USERNAME environment variable
    echo Example: set DOCKER_USERNAME=your-dockerhub-username
    pause
    exit /b 1
)

REM Set version (default: latest)
if "%VERSION%"=="" set VERSION=latest

echo [INFO] Docker Hub Username: %DOCKER_USERNAME%
echo [INFO] Image Version: %VERSION%
echo.

REM Check if Docker is running
echo [INFO] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running, please start Docker Desktop
    pause
    exit /b 1
)

REM Login to Docker Hub
echo [INFO] Logging in to Docker Hub...
docker login
if errorlevel 1 (
    echo [ERROR] Docker Hub login failed
    pause
    exit /b 1
)

REM Build server image
echo [INFO] Building server image...
docker build -f packages/server/Dockerfile -t %DOCKER_USERNAME%/avalon-server:%VERSION% -t %DOCKER_USERNAME%/avalon-server:latest .
if errorlevel 1 (
    echo [ERROR] Server image build failed
    pause
    exit /b 1
)

REM Build client image
echo [INFO] Building client image...
docker build -f packages/client/Dockerfile -t %DOCKER_USERNAME%/avalon-client:%VERSION% -t %DOCKER_USERNAME%/avalon-client:latest .
if errorlevel 1 (
    echo [ERROR] Client image build failed
    pause
    exit /b 1
)

REM Push images to Docker Hub
echo [INFO] Pushing server image...
docker push %DOCKER_USERNAME%/avalon-server:%VERSION%
docker push %DOCKER_USERNAME%/avalon-server:latest

echo [INFO] Pushing client image...
docker push %DOCKER_USERNAME%/avalon-client:%VERSION%
docker push %DOCKER_USERNAME%/avalon-client:latest

echo.
echo [SUCCESS] All images pushed to Docker Hub successfully!
echo.
echo Next steps:
echo 1. Update docker-compose.prod.yml, replace 'your-dockerhub-username' with: %DOCKER_USERNAME%
echo 2. On server run: docker-compose -f docker-compose.prod.yml pull
echo 3. On server run: docker-compose -f docker-compose.prod.yml up -d
echo.
pause
