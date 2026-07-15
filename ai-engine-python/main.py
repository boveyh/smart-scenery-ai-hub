"""
智慧景区 AI 导览系统 - AI 引擎主入口
FastAPI 异步服务,负责：
  1. 数字人模式 HTTP 流式接口 (NDJSON)
  2. 音频静态文件服务
  3. 健康检查 & 服务状态
"""
import asyncio
import base64
import json
import mimetypes
import os
import re
import uuid
import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Scope, Receive, Send
from pydantic import BaseModel, Field
import httpx

from core.llm_client import LLMStreamClient
from core.tts_generator import TTSGenerator, normalize_tts_text
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
VISION_PROVIDER = os.getenv("VISION_PROVIDER", "").lower()
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")
QWEN_BASE_URL = os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
QWEN_VL_MODEL = os.getenv("QWEN_VL_MODEL", "qwen-vl-max")
QWEN_ASR_MODEL = os.getenv("QWEN_ASR_MODEL", "qwen3-asr-flash")
ASR_MAX_BYTES = int(os.getenv("ASR_MAX_BYTES", str(10 * 1024 * 1024)))
VISION_MAX_TOKENS = int(os.getenv("VISION_MAX_TOKENS", "700"))

# 数字人多租户配置加载器
profile_loader = ProfileLoader()

# ─── 全局组件（懒初始化在 lifespan 中完成） ─────────────────
llm_client: LLMStreamClient | None = None
vision_client: LLMStreamClient | None = None
tts_gen: TTSGenerator | None = None
rag_processor: RAGProcessor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化组件，关闭时清理资源"""
    global llm_client, vision_client, tts_gen, rag_processor

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
    if VISION_PROVIDER == "qwen" and QWEN_API_KEY:
        vision_client = LLMStreamClient(
            api_key=QWEN_API_KEY,
            base_url=QWEN_BASE_URL,
            model=QWEN_VL_MODEL,
            max_tokens=LLM_MAX_TOKENS,
            temperature=LLM_TEMPERATURE,
        )
    else:
        vision_client = llm_client
    tts_gen = TTSGenerator(output_dir=TTS_OUTPUT_DIR)
    rag_processor = RAGProcessor(backend_base_url=BACKEND_BASE_URL)

    logger.info("✅ AI 引擎全部组件初始化完成")
    yield
    logger.info("🛑 AI 引擎关闭")


# ─── 多会话上下文管理 ──────────────────────────────────
# 格式: { session_id: [{"role": "user"/"assistant", "content": "..."}] }
SESSION_STORE: dict[str, list[dict]] = {}
MAX_SESSION_HISTORY = 20  # 最大记忆轮次

MULTI_SESSION_SYSTEM_PROMPT = """你是一个景区导览AI助手。请遵守以下规则：

【独立回答 - 不拼接历史】
1. 用户每轮提问都是独立问题，不要拼接或复用上一轮回答的内容。
2. 每轮回答重新组织语言，不保留任何上一轮回答的句式、开场白、结尾套话。
3. 用户问什么就答什么，直接给出答案。例如用户问「灵山大佛有多高」，回答「88米，用铜725吨」即可，不附带其他景点介绍。
4. 回答简洁准确，一句话能说清就不说第二句。
5. 除非用户明确要求详细介绍，否则不给超出问题的额外信息。

【历史引用规则】
6. 历史对话仅作为背景参考，用于理解用户的隐含意图（如"它"指代什么）。
7. 绝对禁止照搬历史中A问题的回答来回答B问题。
8. 每轮回答必须是独立生成的，不是从历史中复制的。"""

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
    persona_prompt: str | None = None
    tts_voice: str | None = None
    tts_rate: str | None = None
    tts_pitch: str | None = None


class ASRResponse(BaseModel):
    text: str
    model: str


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    tenant_id: str = "ling_shan"
    seq: int = 1
    tts_voice: str | None = None
    tts_rate: str | None = None
    tts_pitch: str | None = None


class TTSResponse(BaseModel):
    text: str
    audio_url: str


def infer_emotion(text: str) -> str:
    """Lightweight sentence-level emotion label; no extra model call."""
    t = text.lower()
    rules = [
        ("warning", ["注意", "小心", "危险", "禁止", "不要", "请勿", "安全", "warning", "danger"]),
        ("sad", ["遗憾", "可惜", "纪念", "悼念", "伤心", "沉重", "sad"]),
        ("excited", ["精彩", "震撼", "推荐", "必看", "亮点", "活动", "表演", "excited"]),
        ("happy", ["欢迎", "喜欢", "开心", "高兴", "美", "太好了", "祝您", "happy", "love"]),
        ("serious", ["历史", "文化", "宗教", "佛教", "典故", "保护", "规定", "serious"]),
    ]
    for emotion, keywords in rules:
        if any(k in t for k in keywords):
            return emotion
    return "calm"


def split_tts_sentences(text: str) -> list[str]:
    raw_parts = [p.strip() for p in re.findall(r"[^。！？!?；;.\n]+[。！？!?；;.\n]?", text) if p.strip()]
    parts: list[str] = []
    for part in raw_parts:
        cleaned = normalize_tts_text(part, max_len=120)
        if not cleaned:
            continue
        parts.append(cleaned)
    return parts


def compact_vision_prompt(persona_prompt: str) -> str:
    return (
        f"{persona_prompt}\n\n"
        "用户上传了一张图片。请只用中文口语化讲解，控制在2到3句，"
        "先说图片里最重要的内容，再结合灵山胜境给一句导览说明。"
        "不要使用 Markdown，不要加粗，不要列表，不要输出星号。"
    )


# ─── 核心接口 ─────────────────────────────────────────────

@app.post("/api/v1/tts/synthesize", response_model=TTSResponse)
async def synthesize_tts(req: TTSRequest, request: Request):
    tenant_id = request.headers.get("X-Tenant-Id", req.tenant_id or "ling_shan")
    text = normalize_tts_text(req.text, max_len=220)
    if not text:
        raise HTTPException(status_code=400, detail="没有可播报的文本")

    profile = profile_loader.get(tenant_id)
    if not tts_gen:
        raise HTTPException(status_code=500, detail="TTS 引擎未初始化")

    audio_url = await tts_gen.generate_audio(
        text=text,
        tenant_id=tenant_id,
        session_id=req.session_id,
        seq=req.seq,
        voice=req.tts_voice or profile.get("tts_voice", "zh-CN-XiaoxiaoNeural"),
        rate=req.tts_rate or profile.get("tts_rate", "+10%"),
        pitch=req.tts_pitch or profile.get("tts_pitch", "+0Hz"),
    )
    if not audio_url:
        raise HTTPException(status_code=502, detail="TTS 生成失败")
    return TTSResponse(text=text, audio_url=audio_url)


@app.post("/api/v1/asr/transcribe", response_model=ASRResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    if not QWEN_API_KEY:
        raise HTTPException(status_code=500, detail="QWEN_API_KEY 未配置，无法使用语音识别")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="没有收到音频内容")
    if len(audio_bytes) > ASR_MAX_BYTES:
        raise HTTPException(status_code=413, detail="音频太大，请控制在 10MB 以内")

    mime_type = audio.content_type or mimetypes.guess_type(audio.filename or "")[0] or "audio/webm"
    data_uri = f"data:{mime_type};base64,{base64.b64encode(audio_bytes).decode('ascii')}"
    endpoint = f"{QWEN_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": QWEN_ASR_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {"data": data_uri},
                    }
                ],
            }
        ],
        "stream": False,
        "asr_options": {"enable_itn": False},
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                headers={
                    "Authorization": f"Bearer {QWEN_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        resp.raise_for_status()
        data = resp.json()
        text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
        if not text:
            logger.warning("ASR 返回为空: %s", data)
            raise HTTPException(status_code=502, detail="语音识别结果为空")
        return ASRResponse(text=text, model=QWEN_ASR_MODEL)
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        logger.error("ASR 调用失败: %s %s", e.response.status_code, e.response.text[:500])
        raise HTTPException(status_code=502, detail=f"语音识别服务返回错误: {e.response.status_code}") from e
    except Exception as e:
        logger.error("ASR 处理异常: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"语音识别失败: {e}") from e


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
    persona_prompt = req.persona_prompt or profile.get("persona_prompt")
    tts_voice = req.tts_voice or profile.get("tts_voice", "zh-CN-XiaoxiaoNeural")
    tts_rate = req.tts_rate or profile.get("tts_rate", "+10%")
    tts_pitch = req.tts_pitch or profile.get("tts_pitch", "+0Hz")
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

            # ─── Step 3: LLM 流式调用（传入最近3轮历史用于上下文理解） ──
            last_text = ""
            full_response = ""
            # 只取最近3轮（6条消息，因为每轮user+assistant各一条）
            recent_history = history[-6:] if len(history) > 6 else history
            async for sentence in llm_client.stream_with_sentence_splitting(
                system_prompt=full_system_prompt,
                user_message=req.content,
                history=recent_history if recent_history else None,
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

                # ─── Step 5: NDJSON 行输出（含 emotion 字段） ──
                yield json.dumps(
                    {
                        "seq": seq,
                        "text_chunk": trimmed,
                        "audio_url": audio_url,
                        "emotion": infer_emotion(trimmed),
                    },
                    ensure_ascii=False,
                ) + "\n"

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


@app.post("/api/v1/vision/recognize")
async def vision_recognize(request: Request):
    """
    图片识别流式接口（NDJSON）
    接收文字 + 图片(base64)，调用千问多模态模型识别
    """
    tenant_id = request.headers.get("X-Tenant-Id", "default")
    try:
        body = await request.json()
    except Exception as e:
        logger.warning(f"视觉识别请求体解析失败: {e}")
        body = {}

    async def generate():
        try:
            started_at = time.perf_counter()
            content = body.get("content", "")
            images_b64 = body.get("images", [])
            if not images_b64:
                yield json.dumps({"type": "error", "message": "请上传图片"}, ensure_ascii=False) + "\n"
                return

            profile = profile_loader.get(tenant_id)
            persona_prompt = body.get("persona_prompt") or profile.get("persona_prompt", "你是一个专业的智慧景区AI导览助手。")
            tts_voice = body.get("tts_voice") or profile.get("tts_voice", "zh-CN-XiaoxiaoNeural")
            tts_rate = body.get("tts_rate") or profile.get("tts_rate", "+10%")
            tts_pitch = body.get("tts_pitch") or profile.get("tts_pitch", "+0Hz")
            session_id = body.get("session_id") or uuid.uuid4().hex
            system_prompt = compact_vision_prompt(persona_prompt)

            logger.info(f"vision 调用 chat_with_images: images={len(images_b64)}张")
            client = vision_client or llm_client
            result = await client.chat_with_images(
                system_prompt=system_prompt,
                user_message=content or "请用2到3句话讲解这张图片。",
                images=images_b64,
                max_tokens=VISION_MAX_TOKENS,
            )
            logger.info(f"vision 识别结果: {len(result)} 字符, 耗时={time.perf_counter() - started_at:.2f}s")
            seq = 0
            sentences = split_tts_sentences(result)
            for sentence in sentences:
                seq += 1
                audio_url = ""
                if tts_gen and seq == 1:
                    try:
                        audio_url = await asyncio.wait_for(
                            tts_gen.generate_audio(
                                text=sentence,
                                tenant_id=tenant_id,
                                session_id=session_id,
                                seq=seq,
                                voice=tts_voice,
                                rate=tts_rate,
                                pitch=tts_pitch,
                            ),
                            timeout=35.0,
                        )
                    except asyncio.TimeoutError:
                        logger.warning(f"vision TTS 超时(seq={seq}): 降级纯文本")
                    except Exception as e:
                        logger.warning(f"vision TTS 生成失败(seq={seq}): 降级纯文本: {e}")
                yield json.dumps(
                    {
                        "seq": seq,
                        "type": "text",
                        "content": sentence,
                        "text_chunk": sentence,
                        "audio_url": audio_url,
                        "tts_status": "ok" if audio_url else "pending",
                        "emotion": infer_emotion(sentence),
                    },
                    ensure_ascii=False,
                ) + "\n"
                logger.info(f"vision 输出 seq={seq}, audio={bool(audio_url)}, elapsed={time.perf_counter() - started_at:.2f}s")
            yield json.dumps({"seq": seq + 1, "type": "end", "reason": "complete"}, ensure_ascii=False) + "\n"

        except Exception as e:
            logger.error(f"视觉识别异常: {e}", exc_info=True)
            yield json.dumps({"type": "error", "code": 500, "message": str(e)}, ensure_ascii=False) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

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
