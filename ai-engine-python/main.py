"""
智慧景区 AI 导览系统 - AI 引擎主入口
FastAPI 异步服务,负责：
  1. 数字人模式 HTTP 流式接口 (NDJSON)
  2. 音频静态文件服务
  3. 健康检查 & 服务状态
"""
import asyncio
import json
import os
import uuid
import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Scope, Receive, Send
from pydantic import BaseModel, Field

from core.llm_client import LLMStreamClient
from core.tts_generator import TTSGenerator
from core.rag_processor import RAGProcessor

# ─── 数字人配置 ──────────────────────────────────────────
from config.digital_human.profile_loader import ProfileLoader

# ─── 环境变量加载 ─────────────────────────────────────────
load_dotenv(override=True)

# ─── 日志 ──────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ai-engine")

# ─── 配置常量（全部从 .env 读取，严禁硬编码） ──────────────
LLM_API_KEY     = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL    = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
LLM_MODEL       = os.getenv("LLM_MODEL", "deepseek-chat")
LLM_MAX_TOKENS  = int(os.getenv("LLM_MAX_TOKENS", "2048"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
TTS_OUTPUT_DIR  = os.getenv("TTS_OUTPUT_DIR", "./static/audio")
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:9000")

# 数字人多租户配置加载器
profile_loader = ProfileLoader()

# ─── 全局组件（懒初始化在 lifespan 中完成） ─────────────────
llm_client: LLMStreamClient | None = None
tts_gen: TTSGenerator | None = None
rag_processor: RAGProcessor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化组件，关闭时清理资源"""
    global llm_client, tts_gen, rag_processor

    # 确保音频输出目录存在
    Path(TTS_OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    # 初始化核心组件
    llm_client = LLMStreamClient(
        api_key=LLM_API_KEY,
        base_url=LLM_BASE_URL,
        model=LLM_MODEL,
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
    )
    tts_gen = TTSGenerator(output_dir=TTS_OUTPUT_DIR)
    rag_processor = RAGProcessor(backend_base_url=BACKEND_BASE_URL)

    logger.info("✅ AI 引擎全部组件初始化完成")
    yield
    logger.info("🛑 AI 引擎关闭")


# ─── 多会话上下文管理 ──────────────────────────────────
# 格式: { session_id: [{"role": "user"/"assistant", "content": "..."}] }
SESSION_STORE: dict[str, list[dict]] = {}
MAX_SESSION_HISTORY = 20  # 最大记忆轮次

MULTI_SESSION_SYSTEM_PROMPT = """你是支持多会话独立对话的智能助手，严格遵循以下多会话机制执行所有对话逻辑：

1. 会话隔离规则（最高优先级）
- 所有对话记忆、上下文、问答记录**严格按【会话ID】独立隔离**
- 不同会话之间完全独立，禁止跨会话读取、引用、回忆、混淆任何内容
- A会话的聊天记录、数据、结论、提问内容，绝对不能出现在B会话中

2. 单会话上下文规则
- 同一个会话ID内，保持完整上下文连续、记忆持续、逻辑连贯
- 能够理解当前会话的历史对话、承接上文、延续任务、迭代修改内容

3. 会话操作指令识别
- 接收【新建会话】指令：清空当前上下文，生成全新独立会话，后续对话属于新会话，与旧会话彻底隔离
- 接收【删除会话+会话ID】指令：永久删除指定会话的所有记忆与对话数据，不再留存、不再回忆
- 接收【清空当前会话】指令：清空当前会话所有上下文，重启当前对话

4. 输出规范
- 永远只响应「当前激活会话」的内容
- 不会主动提及其他会话的存在、内容、历史
- 会话切换、新建、删除后，严格重置对应对话逻辑，无残留上下文

5. 兼容用户所有场景
支持数据分析、文案创作、代码编写、大屏设计、答疑、方案撰写，所有任务均遵循多会话隔离机制。"""

# ─── FastAPI 应用实例 ─────────────────────────────────────
app = FastAPI(
    title="智慧景区 AI 导览引擎",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS 允许小程序 / 管理后台跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录（音频文件通过 URL 对外暴露）
Path(TTS_OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="./static"), name="static")

# 给静态文件的响应添加 CORS header
@app.middleware("http")
async def add_cors_to_static(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response


# ─── 请求/响应模型 ────────────────────────────────────────

class DigitalHumanRequest(BaseModel):
    """数字人模式请求体（对齐 API 文档 v2.0 §3.1）"""
    session_id: str = Field(default_factory=lambda: uuid.uuid4().hex, description="会话唯一标识")
    content: str = Field(..., min_length=1, max_length=2000, description="游客输入文本")
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000), description="毫秒时间戳")


# ─── 核心接口 ─────────────────────────────────────────────

@app.post("/api/v1/digitalhuman/chat")
async def digitalhuman_chat(req: DigitalHumanRequest, request: Request):
    """
    数字人模式 HTTP 流式接口（NDJSON）
    对齐 API 文档 v2.0 §3 — 音视解耦核心链路

    处理流程:
      tenant_id → RAG 检索 + 错峰 Prompt 注入
               → LLM 异步流式调用
               → 句级切片
               → edge-tts 生成 MP3
               → NDJSON 流式返回 {seq, text_chunk, audio_url}
    """
    tenant_id = request.headers.get("X-Tenant-Id", "default")
    logger.info(f"[{tenant_id}][{req.session_id}] 收到数字人请求: {req.content[:50]}...")

    # ─── 加载租户数字人配置 ────────────────────────────────
    profile = profile_loader.get(tenant_id)
    persona_prompt = profile.get("persona_prompt")
    tts_voice = profile.get("tts_voice", "zh-CN-XiaoxiaoNeural")
    tts_rate = profile.get("tts_rate", "+10%")
    tts_pitch = profile.get("tts_pitch", "+0Hz")
    persona_name = profile.get("persona_name", "AI导览")

    async def generate_ndjson():
        seq = 0
        try:
            yield json.dumps({"seq": 0, "type": "start", "text_chunk": ""}, ensure_ascii=False) + "\n"

            # ─── Step 1: 会话上下文管理 ──────────────────────
            session_id = req.session_id
            if session_id not in SESSION_STORE:
                SESSION_STORE[session_id] = []
            history = SESSION_STORE[session_id]

            # ─── Step 2: RAG 检索 + Prompt 注入 ────────────
            if rag_processor:
                system_prompt = await rag_processor.build_system_prompt(
                    tenant_id=tenant_id,
                    user_query=req.content,
                    persona_prompt=persona_prompt,
                )
            else:
                system_prompt = persona_prompt or "你是一个专业的智慧景区AI导览助手,请用自然口语化的中文回答游客问题。"

            # 合并多会话提示词 + 人设提示词
            full_system_prompt = f"{MULTI_SESSION_SYSTEM_PROMPT}\n\n{system_prompt}"

            # ─── Step 3: LLM 流式调用（携带历史上下文） ──────
            last_text = ""
            full_response = ""
            async for sentence in llm_client.stream_with_sentence_splitting(
                system_prompt=full_system_prompt,
                user_message=req.content,
                history=history,
            ):
                trimmed = sentence.strip()
                if not trimmed or trimmed == last_text:
                    continue
                last_text = trimmed
                full_response += trimmed
                seq += 1

                # ─── Step 4: TTS 异步生成 MP3 ──────────────
                audio_url = ""
                if tts_gen:
                    try:
                        audio_url = await asyncio.wait_for(
                            tts_gen.generate_audio(
                                text=trimmed,
                                tenant_id=tenant_id,
                                session_id=session_id,
                                seq=seq,
                                voice=tts_voice,
                                rate=tts_rate,
                                pitch=tts_pitch,
                            ),
                            timeout=15.0,
                        )
                    except asyncio.TimeoutError:
                        logger.warning(f"TTS 超时(seq={seq}): 降级纯文本")
                    except Exception as e:
                        logger.warning(f"TTS 生成失败(seq={seq}): 降级纯文本: {e}")

                # ─── Step 5: NDJSON 行输出 ──────────────────
                yield json.dumps({"seq": seq, "text_chunk": trimmed, "audio_url": audio_url}, ensure_ascii=False) + "\n"

            # ─── Step 6: 保存会话历史（限制最大轮次） ──────────
            history.append({"role": "user", "content": req.content})
            history.append({"role": "assistant", "content": full_response})
            if len(history) > MAX_SESSION_HISTORY * 2:
                SESSION_STORE[session_id] = history[-(MAX_SESSION_HISTORY * 2):]

            yield json.dumps({"seq": seq + 1, "type": "end", "reason": "complete"}, ensure_ascii=False) + "\n"

        except Exception as e:
            logger.error(f"流式处理异常: {e}", exc_info=True)
            yield json.dumps({"type": "error", "code": 500, "message": str(e)}, ensure_ascii=False) + "\n"

    return StreamingResponse(
        generate_ndjson(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # 禁用 Nginx 缓冲
        },
    )


@app.post("/api/v1/textchat")
async def text_chat(req: DigitalHumanRequest, request: Request):
    """
    极速文本模式流式接口（NDJSON，纯文本，无 TTS）
    供后端 WebSocket 处理器转发调用。
    """
    tenant_id = request.headers.get("X-Tenant-Id", "default")
    logger.info(f"[{tenant_id}][{req.session_id}] 文本咨询请求: {req.content[:50]}...")

    async def generate_ndjson():
        seq = 0
        try:
            if rag_processor:
                system_prompt = await rag_processor.build_system_prompt(
                    tenant_id=tenant_id,
                    user_query=req.content,
                )
            else:
                system_prompt = "你是一个专业的智慧景区AI导览助手，请用自然口语化的中文回答游客问题。"

            last_text = ""
            async for sentence in llm_client.stream_with_sentence_splitting(
                system_prompt=system_prompt,
                user_message=req.content,
            ):
                trimmed = sentence.strip()
                if not trimmed or trimmed == last_text:
                    continue
                last_text = trimmed
                seq += 1
                yield json.dumps({"type": "text", "content": trimmed, "seq": seq}, ensure_ascii=False) + "\n"

            yield json.dumps({"type": "end", "reason": "stop", "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}}, ensure_ascii=False) + "\n"

        except Exception as e:
            logger.error(f"文本咨询流式异常: {e}", exc_info=True)
            yield json.dumps({"type": "error", "code": 500, "message": str(e)}, ensure_ascii=False) + "\n"

    return StreamingResponse(
        generate_ndjson(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/v1/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "model": LLM_MODEL,
        "tts_dir": TTS_OUTPUT_DIR,
        "timestamp": int(time.time() * 1000),
    }


# ─── 工具函数 ─────────────────────────────────────────────

def __json_escape(s: str) -> str:
    """安全地将字符串嵌入 JSON 值（简易版,适用于中文为主的 NDJSON 输出）"""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "")


# ─── 入口 ─────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True, log_level="info")