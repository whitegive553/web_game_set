# AI Agent Service

## 简介

这是一个基于 FastAPI 的 AI Agent 服务框架，目前仅提供基础接口实现，不包含真实的 AI/RAG/LangChain 逻辑。

## 接口说明

### 1. 健康检查
- **GET** `/health`
- 返回: `{"status": "ok"}`

### 2. AI 聊天（流式输出）
- **POST** `/ai/chat`
- 使用 Server-Sent Events (SSE) 实现流式输出
- 当前为模拟实现，未来接入 LangChain

### 3. PPT 文档摄入
- **POST** `/ai/ingest/pptx`
- 接收 PPT 文件或文件路径
- 当前仅返回占位响应
- TODO: 实现文档解析、向量化、存储到 Weaviate

## 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 运行服务
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --port 8000
```

## Docker 运行

```bash
# 构建镜像
docker build -t ai-agent-service .

# 运行容器
docker run -p 8000:8000 ai-agent-service
```

## 未来计划

- [ ] 接入 LangChain Agent
- [ ] 实现 RAG (检索增强生成)
- [ ] PPT/PDF 文档解析
- [ ] Weaviate 向量数据库集成
- [ ] 真实的 Embedding 生成
