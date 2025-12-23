# 快速开始指南

## 本地测试（Windows）

```powershell
# 1. 确保 Docker Desktop 已安装并运行

# 2. 运行部署脚本
.\deploy.ps1

# 3. 访问游戏
# 浏览器打开: http://localhost
```

## 本地测试（Linux/Mac）

```bash
# 1. 确保 Docker 已安装

# 2. 给脚本执行权限
chmod +x deploy.sh

# 3. 运行部署脚本
./deploy.sh

# 4. 访问游戏
# 浏览器打开: http://localhost
```

## 部署到阿里云

### 一键部署

```bash
# 1. SSH 连接到服务器
ssh root@你的服务器IP

# 2. 上传代码到服务器
# 方式 A: 使用 Git
git clone https://github.com/你的用户名/项目名.git
cd 项目名

# 方式 B: 使用 SCP 上传
# (在本地执行)
scp -r C:\aipengze\web_llm root@你的服务器IP:/root/apps/avalon-game

# 3. 在服务器上运行部署脚本
cd /root/apps/avalon-game
chmod +x deploy.sh
./deploy.sh

# 4. 访问游戏
# 浏览器打开: http://你的服务器IP
```

### 手动部署

如果自动脚本失败，请参考详细文档：

```bash
cat DEPLOYMENT.md
```

## 常见问题

### Q: 端口被占用怎么办？

```bash
# 查看占用 80 端口的进程
sudo lsof -i :80

# 查看占用 3001 端口的进程
sudo lsof -i :3001

# 停止占用端口的进程
sudo kill -9 <进程ID>
```

### Q: 如何查看日志？

```bash
# 查看所有日志
docker-compose logs -f

# 只看后端日志
docker-compose logs -f server

# 只看前端日志
docker-compose logs -f client
```

### Q: 如何重启服务？

```bash
# 重启所有服务
docker-compose restart

# 只重启后端
docker-compose restart server

# 只重启前端
docker-compose restart client
```

### Q: 如何停止服务？

```bash
docker-compose down
```

### Q: 如何更新代码？

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose build
docker-compose up -d
```

## 下一步

- 📖 阅读完整部署文档：`DEPLOYMENT.md`
- 🔒 配置 HTTPS（推荐）
- 📊 设置监控和日志
- 🔐 加强安全配置

## 技术支持

如遇到问题：
1. 查看 `DEPLOYMENT.md` 的故障排查章节
2. 检查服务日志：`docker-compose logs -f`
3. 验证容器状态：`docker-compose ps`
