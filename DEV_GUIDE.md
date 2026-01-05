# AI Agent 功能开发指南

## 快速开始

### 方式一：Docker 部署（推荐生产环境）

```bash
# 使用自动部署脚本
sudo ./deploy.sh

# 或手动启动
docker compose up --build -d
```

访问: http://localhost/ai_agent

---

### 方式二：本地开发模式

#### 1. 启动 Node.js 服务（前端 + 后端）

```bash
# 在项目根目录
npm run dev
```

这会同时启动：
- 前端开发服务器（Vite）：http://localhost:3000
- 后端服务器（Node.js）：http://localhost:3001

#### 2. 启动 Python AI 服务

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

**或者手动启动:**
```bash
cd packages/ai-agent-service

# 创建虚拟环境（首次）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

AI 服务启动后访问: http://localhost:8000

#### 3. 启动 Weaviate（可选，本地开发可跳过）

```bash
docker run -d \
  --name weaviate-dev \
  -p 8080:8080 \
  -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
  -e PERSISTENCE_DATA_PATH=/var/lib/weaviate \
  cr.weaviate.io/semitechnologies/weaviate:1.27.6
```

#### 4. 访问前端页面

```
http://localhost:3000/ai_agent
```

**注意**:
- 已在 `vite.config.ts` 中配置了 `/ai/*` 代理到 `http://localhost:8000`
- 确保 Python AI 服务在 8000 端口运行

---

## 本地开发配置

### 前端代理配置

已在 `packages/client/vite.config.ts` 中配置好代理，无需额外配置：

- `/api/*` → http://localhost:3001 （后端服务）
- `/ai/*` → http://localhost:8000 （AI 服务）

如需修改，编辑 `packages/client/vite.config.ts` 文件。

---

## 开发流程

### 添加新的 AI 接口

1. 在 `packages/ai-agent-service/main.py` 中添加新的路由
2. 在前端创建对应的 API 调用函数
3. 测试接口连通性

### 示例：添加文件上传功能

**后端 (main.py):**
```python
@app.post("/ai/upload")
async def upload_file(file: UploadFile):
    # 处理文件上传
    return {"filename": file.filename}
```

**前端 (TypeScript):**
```typescript
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/ai/upload', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}
```

---

## 常见问题

### Q: 本地开发时前端无法连接到 AI 服务？

**A**: 检查以下几点：
1. AI 服务是否在 8000 端口运行：`curl http://localhost:8000/health`
2. Vite 是否配置了 `/ai` 代理
3. 浏览器控制台是否有 CORS 错误

### Q: Docker 部署后访问不了 /ai_agent 页面？

**A**: 检查：
1. 所有容器是否正常运行：`docker compose ps`
2. Nginx 配置是否正确：`docker exec avalon-client nginx -t`
3. AI 服务健康检查：`docker exec ai-agent-service curl http://localhost:8000/health`

### Q: SSE 流式输出不工作？

**A**: 确保：
1. Nginx 配置了 `proxy_buffering off`
2. 前端正确处理 `text/event-stream`
3. 浏览器支持 SSE（所有现代浏览器都支持）

---

## 下一步开发计划

- [ ] 接入真实 LLM（OpenAI API / 本地模型）
- [ ] 实现 PPT 文档解析
- [ ] 集成 Weaviate RAG 检索
- [ ] 添加对话历史记录
- [ ] 实现多轮对话上下文管理
