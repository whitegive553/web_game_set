# AI Agent 功能快速启动指南

## 🚀 两种启动方式

### 方式一：本地开发模式（推荐开发时使用）

**优点**：代码热更新、调试方便、启动快速

#### 步骤 1：启动前端 + 后端

```bash
npm run dev
```

访问: http://localhost:3000

#### 步骤 2：启动 Python AI 服务

**Windows:**
```bash
cd packages/ai-agent-service
dev.bat
```

**Linux/Mac:**
```bash
cd packages/ai-agent-service
chmod +x dev.sh
./dev.sh
```

#### 步骤 3：访问 AI Agent 页面

```
http://localhost:3000/ai_agent
```

---

### 方式二：Docker 部署模式（推荐生产环境）

**优点**：环境一致、容器隔离、一键部署

```bash
# 使用自动部署脚本
sudo ./deploy.sh

# 或手动启动
docker compose up --build -d
```

访问: http://localhost/ai_agent

---

## ⚙️ 配置说明

### 本地开发配置

已自动配置好 Vite 代理：
- `/api/*` → http://localhost:3001 （后端服务）
- `/ai/*` → http://localhost:8000 （AI 服务）

### Docker 部署配置

Nginx 自动代理：
- `/api/*` → http://server:3001
- `/ws` → http://server:3001/ws
- `/ai/*` → http://ai-agent-service:8000

---

## 🔍 验证功能

1. 访问 AI Agent 页面
2. 在输入框输入任意文本
3. 点击"发送"按钮
4. 观察 SSE 流式输出效果（文字逐段出现，约 0.5 秒间隔）

---

## 📋 常用命令

### 本地开发

```bash
# 查看 AI 服务是否运行
curl http://localhost:8000/health

# 测试 SSE 接口
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### Docker 部署

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f ai-agent-service

# 重启服务
docker compose restart ai-agent-service

# 停止所有服务
docker compose down
```

---

## 🛠️ 故障排查

### 问题 1：本地开发时前端无法连接到 AI 服务

**解决方案：**
```bash
# 检查 AI 服务是否运行
curl http://localhost:8000/health

# 检查 Vite 代理配置
cat packages/client/vite.config.ts | grep -A 5 "'/ai'"
```

### 问题 2：Docker 部署后 /ai_agent 页面 404

**解决方案：**
```bash
# 检查 client 容器日志
docker compose logs client

# 重新构建前端
docker compose up --build client -d
```

### 问题 3：SSE 流式输出不工作

**解决方案：**
```bash
# 检查 Nginx 配置
docker exec avalon-client nginx -t

# 查看 AI 服务日志
docker compose logs -f ai-agent-service
```

---

## 📚 更多信息

- 详细开发指南：[DEV_GUIDE.md](./DEV_GUIDE.md)
- AI 服务 README：[packages/ai-agent-service/README.md](./packages/ai-agent-service/README.md)
- 部署文档：`DEPLOYMENT.md`（如果存在）

---

## 🎯 下一步

当前实现是框架演示，未来可以：

1. 接入真实 LLM（OpenAI API / 本地模型）
2. 实现 PPT 文档解析和摄入
3. 集成 Weaviate 向量数据库 RAG 检索
4. 添加对话历史和上下文管理
5. 实现多轮对话和记忆功能

详见 [DEV_GUIDE.md](./DEV_GUIDE.md) 开发计划部分。
