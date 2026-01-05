"""
AI Agent Service - FastAPI Backend
仅提供框架实现，不包含真实 AI/RAG/LangChain 逻辑
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import time

app = FastAPI(title="AI Agent Service")

# CORS 配置 - 允许来自 nginx 的请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok"}


@app.post("/ai/chat")
async def chat_stream(request: dict):
    """
    AI 聊天接口 - 使用 SSE 流式输出

    这是一个占位实现，模拟流式输出
    未来将接入 LangChain / Agent 逻辑
    """

    async def event_generator():
        """SSE 事件生成器"""

        # 模拟 AI 响应的分段文本
        response_parts = [
            "你好！",
            "我是 AI Agent 助手。",
            "这是一个流式输出的演示。",
            "未来这里将接入真实的 LangChain 和 RAG 系统。",
            "现在你看到的每一段文字都是通过 SSE 逐步推送的。",
            "这证明了流式传输功能已经正常工作。"
        ]

        for i, part in enumerate(response_parts):
            # 构造 SSE 格式的数据
            data = {
                "type": "content",
                "content": part,
                "index": i
            }

            # SSE 格式: data: <json>\n\n
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

            # 模拟处理延迟
            await asyncio.sleep(0.5)

        # 发送结束标记
        end_data = {"type": "done"}
        yield f"data: {json.dumps(end_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
        }
    )


@app.post("/ai/ingest/pptx")
async def ingest_pptx(
    file: UploadFile = File(None),
    file_path: str = Form(None)
):
    """
    PPT 文档摄入接口

    TODO: 未来实现
    - PPT 文件解析 (python-pptx)
    - 文本提取和分块
    - 向量化 (Embedding)
    - 存储到 Weaviate
    """

    if file:
        filename = file.filename
        # 这里应该保存文件并处理，但现在仅返回占位响应
        return {
            "status": "pending",
            "message": "PPT 摄入功能尚未实现",
            "filename": filename,
            "todo": [
                "解析 PPT 文件",
                "提取文本内容",
                "生成文本 Embedding",
                "存储到 Weaviate 向量数据库"
            ]
        }
    elif file_path:
        return {
            "status": "pending",
            "message": "PPT 摄入功能尚未实现",
            "file_path": file_path,
            "todo": [
                "读取 PPT 文件",
                "提取文本内容",
                "生成文本 Embedding",
                "存储到 Weaviate 向量数据库"
            ]
        }
    else:
        return {
            "status": "error",
            "message": "请提供文件或文件路径"
        }


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "AI Agent Service",
        "version": "0.1.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "chat": "POST /ai/chat",
            "ingest_pptx": "POST /ai/ingest/pptx"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
