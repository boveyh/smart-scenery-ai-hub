"""
LLM 流式客户端 — 异步调用商用大模型 + 句级切片算法

核心职责：
  1. 对接兼容 OpenAI Chat Completions 协议的大模型 API（DeepSeek / Qwen / GLM 等）
  2. 实时监听流式打字机输出
  3. 每当检测到句号、问号、感叹号、换行符时立即截断，yield 完整句子
  4. 保障前端 TTFB < 300ms（首个分片极速弹出）

设计原则：
  - 纯 async/await 异步非阻塞
  - 零 GPU 依赖
  - 支持多轮对话上下文
"""

import asyncio
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

logger = logging.getLogger("ai-engine.llm")

# ─── 句级切片触发字符 ─────────────────────────────────────
SENTENCE_BOUNDARIES = {
    "。", "！", "？", "!", "?", ".", "；", ";",
    "\n", "\r\n",
}
PAUSE_BOUNDARIES = {"，", ",", "、", "：", ":"}


class LLMStreamClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.deepseek.com/v1",
        model: str = "deepseek-chat",
        max_tokens: int = 2048,
        temperature: float = 0.7,
        timeout: float = 30.0,
    ):
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout)
        logger.info(f"LLM client initialized: model={model}, base_url={base_url}")

    async def stream_with_sentence_splitting(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict] | None = None,
    ) -> AsyncGenerator[str, None]:
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        buffer = ""
        first_chunk_sent = False

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices is None or len(chunk.choices) == 0:
                    continue
                delta = chunk.choices[0].delta
                if delta.content is None:
                    continue
                token = delta.content
                buffer += token

                for boundary in SENTENCE_BOUNDARIES:
                    if boundary in buffer:
                        split_pos = buffer.find(boundary)
                        sentence = buffer[:split_pos + len(boundary)]
                        remainder = buffer[split_pos + len(boundary):]
                        buffer = remainder
                        if not first_chunk_sent:
                            first_chunk_sent = True
                        yield sentence
                        break

            if buffer.strip():
                yield buffer.strip()

        except Exception as e:
            logger.error(f"LLM stream failed: {e}", exc_info=True)
            yield "抱歉，AI 服务暂时无法响应，请稍后重试。"

    async def chat_with_images(
        self,
        system_prompt: str,
        user_message: str,
        images: list[str],
        max_tokens: int = 4096,
    ) -> str:
        import base64 as b64_mod

        content: list[dict] = [{"type": "text", "text": user_message}]
        for img in images:
            mime = "image/jpeg"
            try:
                raw = b64_mod.b64decode(img[:100])
                if raw.startswith(b'\x89PNG'):
                    mime = "image/png"
                elif raw.startswith(b'\xff\xd8'):
                    mime = "image/jpeg"
                elif raw.startswith(b'RIFF') and raw[8:12] == b'WEBP':
                    mime = "image/webp"
                elif raw.startswith(b'GIF8'):
                    mime = "image/gif"
            except Exception:
                pass
            content.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{img}"}})

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content},
            ]

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                stream=False,
            )
            result = response.choices[0].message.content
            if result is None:
                logger.warning("Vision recognition returned empty content")
                return ""
            return result
        except Exception as e:
            logger.error(f"Vision recognition failed: {e}", exc_info=True)
            return ""

    async def chat_simple(self, system_prompt: str, user_message: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stream=False,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"LLM simple call failed: {e}")
            return ""
