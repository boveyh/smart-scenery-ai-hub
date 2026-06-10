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
    "\n", "\r\n",   # 换行符也视为句边界
}
# 逗号/顿号不作为边界，避免碎片化过短影响 TTS 体验
PAUSE_BOUNDARIES = {"，", ",", "、", "：", ":"}


class LLMStreamClient:
    """
    异步流式大模型客户端

    使用示例：
        client = LLMStreamClient(api_key="sk-xxx", base_url="https://api.deepseek.com/v1")
        async for sentence in client.stream_with_sentence_splitting(
            system_prompt="你是景区导游",
            user_message="介绍雷峰塔",
        ):
            print(f"[完整句] {sentence}")
    """

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
        logger.info(f"LLM 客户端初始化: model={model}, base_url={base_url}")

    async def stream_with_sentence_splitting(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict] | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        流式调用 LLM 并实时进行句级切片

        Args:
            system_prompt: 系统提示词（含 RAG 注入 + 错峰指令）
            user_message: 游客当前问题
            history: 历史多轮对话 [{role, content}, ...]

        Yields:
            每个检测到的完整句子（含标点）
        """
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        # ─── 句级切片状态机变量 ────────────────────────────
        buffer = ""           # 当前缓冲区，累积字符直到碰到句边界
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

                # ─── 句边界检测：一旦命中就 yield ──────────
                if any(boundary in buffer for boundary in SENTENCE_BOUNDARIES):
                    # 找到第一个边界位置，截断
                    split_pos = -1
                    split_char = ""
                    for boundary in SENTENCE_BOUNDARIES:
                        pos = buffer.find(boundary)
                        if pos != -1:
                            # 取最靠前的位置
                            if split_pos == -1 or pos < split_pos:
                                split_pos = pos
                                split_char = boundary

                    if split_pos >= 0:
                        sentence = buffer[:split_pos + len(split_char)]
                        remainder = buffer[split_pos + len(split_char):]
                        buffer = remainder
                        if not first_chunk_sent:
                            first_chunk_sent = True
                            logger.debug(f"🎯 首句 TTFB 达标: {sentence[:30]}...")
                        yield sentence

            # ─── 流结束：yield 缓冲区剩余内容 ─────────────
            if buffer.strip():
                yield buffer.strip()

        except Exception as e:
            logger.error(f"LLM 流式调用失败: {e}", exc_info=True)
            # 兜底：返回一个友好提示
            yield "抱歉，AI 服务暂时无法响应，请稍后重试。"

    async def chat_simple(self, system_prompt: str, user_message: str) -> str:
        """
        非流式同步调用（用于 RAG 检索等不需要流式输出的场景）
        """
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
            logger.error(f"LLM 非流式调用失败: {e}")
            return ""


# ─── 独立测试入口 ─────────────────────────────────────────
async def _test():
    import os
    from dotenv import load_dotenv
    load_dotenv()

    client = LLMStreamClient(
        api_key=os.getenv("LLM_API_KEY", ""),
        base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
        model=os.getenv("LLM_MODEL", "deepseek-chat"),
    )

    print("=" * 60)
    print("句级切片算法测试")
    print("=" * 60)
    async for s in client.stream_with_sentence_splitting(
        system_prompt="你是西湖景区的AI导游。请用口语化的中文回答，每句话不超过30字。",
        user_message="请介绍一下西湖十景，简单说说就好。",
    ):
        print(f"→ [{s}]")


if __name__ == "__main__":
    asyncio.run(_test())